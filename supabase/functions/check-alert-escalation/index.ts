import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ESCALATION_THRESHOLD_MINUTES = 15; // Escalate after 15 minutes

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Checking for alerts to escalate...");

    // Calculate the threshold time (current time - threshold minutes)
    const thresholdTime = new Date(
      Date.now() - ESCALATION_THRESHOLD_MINUTES * 60 * 1000
    ).toISOString();

    // Find active alerts that are older than the threshold and not yet escalated
    const { data: alertsToEscalate, error: fetchError } = await supabase
      .from("emergency_alerts")
      .select("*")
      .eq("status", "active")
      .lt("created_at", thresholdTime);

    if (fetchError) {
      console.error("Error fetching alerts:", fetchError);
      throw fetchError;
    }

    if (!alertsToEscalate || alertsToEscalate.length === 0) {
      console.log("No alerts to escalate");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No alerts to escalate",
          escalated: 0,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Found ${alertsToEscalate.length} alerts to escalate`);

    // Escalate each alert
    const escalationResults = await Promise.all(
      alertsToEscalate.map(async (alert) => {
        try {
          // Update alert status to escalated
          const { error: updateError } = await supabase
            .from("emergency_alerts")
            .update({ status: "escalated" })
            .eq("id", alert.id);

          if (updateError) {
            console.error(`Failed to escalate alert ${alert.id}:`, updateError);
            return { alertId: alert.id, success: false, error: updateError.message };
          }

          console.log(`Successfully escalated alert ${alert.id}`);

          // Get user's emergency contacts
          const { data: contacts, error: contactsError } = await supabase
            .from("personal_contacts")
            .select("*")
            .eq("user_id", alert.user_id);

          if (contactsError || !contacts || contacts.length === 0) {
            console.log(`No contacts found for user ${alert.user_id}`);
            return { alertId: alert.id, success: true, notificationsSent: false };
          }

          // Send escalation notifications
          const { error: notificationError } = await supabase.functions.invoke(
            "send-emergency-email",
            {
              body: {
                alertId: alert.id,
                contacts: contacts.map(c => ({
                  name: c.name,
                  email: c.email,
                  phone: c.phone,
                })),
                emergencyType: `ESCALATED: ${alert.emergency_type}`,
                situation: `⚠️ ESCALATED ALERT - NO RESPONSE FOR ${ESCALATION_THRESHOLD_MINUTES} MINUTES\n\n${alert.situation}`,
                location: {
                  latitude: alert.latitude,
                  longitude: alert.longitude,
                },
                evidenceFiles: alert.evidence_files,
              },
            }
          );

          if (notificationError) {
            console.error(`Failed to send notifications for alert ${alert.id}:`, notificationError);
            return { alertId: alert.id, success: true, notificationsSent: false };
          }

          return { alertId: alert.id, success: true, notificationsSent: true };
        } catch (error: any) {
          console.error(`Error processing alert ${alert.id}:`, error);
          return { alertId: alert.id, success: false, error: error.message };
        }
      })
    );

    const successCount = escalationResults.filter((r) => r.success).length;
    const notificationsSentCount = escalationResults.filter(
      (r) => r.notificationsSent
    ).length;

    console.log(
      `Escalation complete: ${successCount} alerts escalated, ${notificationsSentCount} notifications sent`
    );

    return new Response(
      JSON.stringify({
        success: true,
        escalated: successCount,
        notificationsSent: notificationsSentCount,
        results: escalationResults,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in check-alert-escalation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

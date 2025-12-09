import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Medication {
  id: string;
  user_id: string;
  name: string;
  dosage: string;
  frequency: string;
  time_of_day: string[];
  is_active: boolean;
}

// Map time_of_day values to approximate hours
const timeToHourMap: Record<string, number[]> = {
  morning: [7, 8, 9],
  noon: [11, 12, 13],
  afternoon: [14, 15, 16],
  evening: [18, 19, 20],
  bedtime: [21, 22, 23]
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();
    const currentHour = now.getHours();

    console.log(`Checking medication reminders at hour ${currentHour}`);

    // Find which time_of_day values match current hour
    const matchingTimes: string[] = [];
    for (const [timeKey, hours] of Object.entries(timeToHourMap)) {
      if (hours.includes(currentHour)) {
        matchingTimes.push(timeKey);
      }
    }

    if (matchingTimes.length === 0) {
      console.log("No matching reminder times for current hour");
      return new Response(
        JSON.stringify({ message: "No reminders due at this hour", hour: currentHour }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Checking for medications with times: ${matchingTimes.join(", ")}`);

    // Fetch active medications
    const { data: medications, error: medError } = await supabase
      .from("medications")
      .select("*")
      .eq("is_active", true);

    if (medError) {
      console.error("Error fetching medications:", medError);
      throw medError;
    }

    if (!medications || medications.length === 0) {
      console.log("No active medications found");
      return new Response(
        JSON.stringify({ message: "No active medications", notificationsSent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter medications that need reminders now
    const medicationsNeedingReminders = medications.filter((med: Medication) => {
      if (!med.time_of_day || med.time_of_day.length === 0) return false;
      return med.time_of_day.some(time => matchingTimes.includes(time));
    });

    console.log(`Found ${medicationsNeedingReminders.length} medications needing reminders`);

    let notificationsSent = 0;

    // Create in-app notifications for each medication
    for (const med of medicationsNeedingReminders) {
      const notification = {
        user_id: med.user_id,
        title: "💊 Medication Reminder",
        message: `Time to take ${med.name} (${med.dosage})`,
        type: "medication",
        action_url: "/medical-records"
      };

      const { error: notifError } = await supabase
        .from("in_app_notifications")
        .insert(notification);

      if (notifError) {
        console.error(`Failed to create notification for medication ${med.id}:`, notifError);
      } else {
        notificationsSent++;
        console.log(`Created reminder for ${med.name} for user ${med.user_id}`);
      }
    }

    console.log(`Successfully sent ${notificationsSent} medication reminders`);

    return new Response(
      JSON.stringify({
        success: true,
        hour: currentHour,
        matchingTimes,
        medicationsChecked: medications.length,
        notificationsSent
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in medication reminder check:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

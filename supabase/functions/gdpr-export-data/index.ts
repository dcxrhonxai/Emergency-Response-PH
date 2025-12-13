import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Exporting data for user:", user.id);

    // Collect all user data from various tables
    const [
      profileResult,
      alertsResult,
      contactsResult,
      doctorsResult,
      medicationsResult,
      medicalHistoryResult,
      contactGroupsResult,
      ratingsResult,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("emergency_alerts").select("*").eq("user_id", user.id),
      supabase.from("personal_contacts").select("*").eq("user_id", user.id),
      supabase.from("doctor_contacts").select("*").eq("user_id", user.id),
      supabase.from("medications").select("*").eq("user_id", user.id),
      supabase.from("medical_history").select("*").eq("user_id", user.id),
      supabase.from("contact_groups").select("*").eq("user_id", user.id),
      supabase.from("service_ratings").select("*").eq("user_id", user.id),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      userId: user.id,
      email: user.email,
      profile: profileResult.data,
      emergencyAlerts: alertsResult.data || [],
      personalContacts: contactsResult.data || [],
      doctorContacts: doctorsResult.data || [],
      medications: medicationsResult.data || [],
      medicalHistory: medicalHistoryResult.data || [],
      contactGroups: contactGroupsResult.data || [],
      serviceRatings: ratingsResult.data || [],
    };

    console.log("Data export completed successfully");

    return new Response(JSON.stringify(exportData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error exporting data:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

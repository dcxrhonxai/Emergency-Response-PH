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

    console.log("Deleting all data for user:", user.id);

    // Delete all user data from various tables (order matters due to foreign keys)
    const deletions = await Promise.all([
      supabase.from("service_ratings").delete().eq("user_id", user.id),
      supabase.from("medical_history").delete().eq("user_id", user.id),
      supabase.from("medications").delete().eq("user_id", user.id),
      supabase.from("doctor_contacts").delete().eq("user_id", user.id),
      supabase.from("personal_contacts").delete().eq("user_id", user.id),
      supabase.from("contact_groups").delete().eq("user_id", user.id),
      supabase.from("emergency_alerts").delete().eq("user_id", user.id),
      supabase.from("in_app_notifications").delete().eq("user_id", user.id),
      supabase.from("profiles").delete().eq("id", user.id),
    ]);

    // Check for errors in deletions
    const errors = deletions.filter(d => d.error).map(d => d.error?.message);
    if (errors.length > 0) {
      console.error("Errors during deletion:", errors);
    }

    // Delete the user account
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteUserError) {
      console.error("Error deleting user account:", deleteUserError);
      return new Response(JSON.stringify({ error: "Failed to delete user account" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("User account and all data deleted successfully");

    return new Response(JSON.stringify({ success: true, message: "Account and all data deleted" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

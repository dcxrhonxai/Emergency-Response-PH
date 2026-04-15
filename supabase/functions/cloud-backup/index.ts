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

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, backupData } = await req.json();

    if (action === "create") {
      console.log("Creating backup for user:", user.id);

      const [
        profileResult,
        contactsResult,
        doctorsResult,
        medicationsResult,
        medicalHistoryResult,
        contactGroupsResult,
        groupMembersResult,
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("personal_contacts").select("*").eq("user_id", user.id),
        supabase.from("doctor_contacts").select("*").eq("user_id", user.id),
        supabase.from("medications").select("*").eq("user_id", user.id),
        supabase.from("medical_history").select("*").eq("user_id", user.id),
        supabase.from("contact_groups").select("*").eq("user_id", user.id),
        supabase.from("contact_group_members").select("*, contact_groups!inner(user_id)").eq("contact_groups.user_id", user.id),
      ]);

      const backup = {
        version: 1,
        createdAt: new Date().toISOString(),
        userId: user.id,
        profile: profileResult.data,
        personalContacts: contactsResult.data || [],
        doctorContacts: doctorsResult.data || [],
        medications: medicationsResult.data || [],
        medicalHistory: medicalHistoryResult.data || [],
        contactGroups: contactGroupsResult.data || [],
        contactGroupMembers: groupMembersResult.data || [],
      };

      return new Response(JSON.stringify({ backup }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "restore") {
      if (!backupData || backupData.version !== 1) {
        return new Response(JSON.stringify({ error: "Invalid backup data" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Restoring backup for user:", user.id);
      const results: Record<string, string> = {};

      // Restore profile
      if (backupData.profile) {
        const { full_name, phone_number, blood_type, allergies, medical_conditions, emergency_notes } = backupData.profile;
        const { error } = await supabase.from("profiles").update({
          full_name, phone_number, blood_type, allergies, medical_conditions, emergency_notes,
        }).eq("id", user.id);
        results.profile = error ? `error: ${error.message}` : "ok";
      }

      // Restore personal contacts (upsert by name+phone)
      if (backupData.personalContacts?.length) {
        for (const c of backupData.personalContacts) {
          const { error } = await supabase.from("personal_contacts").upsert({
            user_id: user.id,
            name: c.name,
            phone: c.phone,
            relationship: c.relationship,
          }, { onConflict: "id", ignoreDuplicates: true });
          if (error) console.error("Contact restore error:", error.message);
        }
        results.personalContacts = "ok";
      }

      // Restore doctor contacts
      if (backupData.doctorContacts?.length) {
        for (const d of backupData.doctorContacts) {
          const { error } = await supabase.from("doctor_contacts").upsert({
            user_id: user.id,
            name: d.name,
            phone: d.phone,
            specialty: d.specialty,
            hospital: d.hospital,
            email: d.email,
            address: d.address,
            notes: d.notes,
            is_primary: d.is_primary,
          }, { onConflict: "id", ignoreDuplicates: true });
          if (error) console.error("Doctor restore error:", error.message);
        }
        results.doctorContacts = "ok";
      }

      // Restore medications
      if (backupData.medications?.length) {
        for (const m of backupData.medications) {
          const { error } = await supabase.from("medications").upsert({
            user_id: user.id,
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            time_of_day: m.time_of_day,
            start_date: m.start_date,
            end_date: m.end_date,
            notes: m.notes,
            is_active: m.is_active,
          }, { onConflict: "id", ignoreDuplicates: true });
          if (error) console.error("Medication restore error:", error.message);
        }
        results.medications = "ok";
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Backup error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

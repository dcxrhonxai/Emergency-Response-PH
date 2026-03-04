import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all users who have digest enabled (stored in profiles or we check all users with in_app_notifications)
    // For now, get all users who had notifications during quiet hours (last 24h)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Get unread notifications from the last 24 hours grouped by user
    const { data: notifications, error: notifError } = await supabase
      .from("in_app_notifications")
      .select("*")
      .eq("read", false)
      .gte("created_at", twentyFourHoursAgo)
      .order("created_at", { ascending: false });

    if (notifError) {
      throw new Error(`Failed to fetch notifications: ${notifError.message}`);
    }

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ message: "No missed notifications to digest", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group notifications by user_id
    const userNotifications: Record<string, typeof notifications> = {};
    for (const notif of notifications) {
      if (!userNotifications[notif.user_id]) {
        userNotifications[notif.user_id] = [];
      }
      userNotifications[notif.user_id].push(notif);
    }

    let digestsSent = 0;

    for (const [userId, userNotifs] of Object.entries(userNotifications)) {
      // Get user profile for name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, fcm_token")
        .eq("id", userId)
        .single();

      const userName = profile?.full_name || "User";
      const notifCount = userNotifs.length;

      // Build digest summary
      const typeCounts: Record<string, number> = {};
      for (const n of userNotifs) {
        const type = n.type || "info";
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      }

      const summaryParts = Object.entries(typeCounts).map(
        ([type, count]) => `${count} ${type}`
      );
      const summaryText = summaryParts.join(", ");

      // Create a digest in-app notification
      const { error: insertError } = await supabase
        .from("in_app_notifications")
        .insert({
          user_id: userId,
          title: `📋 Daily Digest: ${notifCount} missed notification${notifCount > 1 ? "s" : ""}`,
          message: `While you were away: ${summaryText}. Check your notification history for details.`,
          type: "digest",
          action_url: "/notification-history",
        });

      if (insertError) {
        console.error(`Failed to create digest for user ${userId}:`, insertError);
        continue;
      }

      // Send push notification if user has FCM token
      if (profile?.fcm_token) {
        const fcmServerKey = Deno.env.get("FCM_SERVER_KEY");
        if (fcmServerKey) {
          try {
            await fetch("https://fcm.googleapis.com/fcm/send", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `key=${fcmServerKey}`,
              },
              body: JSON.stringify({
                to: profile.fcm_token,
                notification: {
                  title: `📋 Daily Digest`,
                  body: `You have ${notifCount} missed notification${notifCount > 1 ? "s" : ""}: ${summaryText}`,
                },
                data: {
                  type: "daily_digest",
                  url: "/notification-history",
                },
              }),
            });
          } catch (e) {
            console.error("FCM push failed for digest:", e);
          }
        }
      }

      digestsSent++;
    }

    return new Response(
      JSON.stringify({
        message: `Daily digest sent to ${digestsSent} user(s)`,
        sent: digestsSent,
        totalNotifications: notifications.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Daily digest error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

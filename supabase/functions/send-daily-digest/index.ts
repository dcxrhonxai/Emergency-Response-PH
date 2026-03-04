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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Get unread notifications from the last 24 hours
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
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, fcm_token")
        .eq("id", userId)
        .single();

      // Get user email from auth
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      const userEmail = authUser?.user?.email;

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

      // Parse delivery preferences from request body or default to all methods
      let deliveryMethods: string[] = ["in_app", "push", "email"];
      try {
        const body = await req.clone().json();
        if (body.deliveryMethods) {
          deliveryMethods = body.deliveryMethods;
        }
      } catch {}

      // 1. In-App notification
      if (deliveryMethods.includes("in_app")) {
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
          console.error(`Failed to create in-app digest for ${userId}:`, insertError);
        }
      }

      // 2. Push notification
      if (deliveryMethods.includes("push") && profile?.fcm_token) {
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
                data: { type: "daily_digest", url: "/notification-history" },
              }),
            });
          } catch (e) {
            console.error("FCM push failed for digest:", e);
          }
        }
      }

      // 3. Email digest
      if (deliveryMethods.includes("email") && userEmail && resendApiKey) {
        // Build notification list HTML
        const notifListHtml = userNotifs
          .slice(0, 20)
          .map(
            (n) =>
              `<tr>
                <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;color:#666;">${new Date(n.created_at).toLocaleString()}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;font-weight:600;">${n.title}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;color:#444;">${n.message}</td>
              </tr>`
          )
          .join("");

        const emailHtml = `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:24px;">
            <h2 style="color:#dc2626;margin-bottom:4px;">📋 Daily Notification Digest</h2>
            <p style="color:#666;margin-top:0;">Hi ${userName}, here's what you missed during quiet hours.</p>
            <div style="background:#fef2f2;border-radius:8px;padding:16px;margin:16px 0;">
              <p style="margin:0;font-size:18px;font-weight:700;color:#dc2626;">${notifCount} missed notification${notifCount > 1 ? "s" : ""}</p>
              <p style="margin:4px 0 0;font-size:14px;color:#666;">${summaryText}</p>
            </div>
            <table style="width:100%;border-collapse:collapse;margin-top:16px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th style="padding:8px 12px;text-align:left;font-size:12px;color:#999;text-transform:uppercase;">Time</th>
                  <th style="padding:8px 12px;text-align:left;font-size:12px;color:#999;text-transform:uppercase;">Title</th>
                  <th style="padding:8px 12px;text-align:left;font-size:12px;color:#999;text-transform:uppercase;">Details</th>
                </tr>
              </thead>
              <tbody>${notifListHtml}</tbody>
            </table>
            ${notifCount > 20 ? `<p style="color:#999;font-size:12px;margin-top:12px;">Showing 20 of ${notifCount} notifications. View all in the app.</p>` : ""}
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
            <p style="color:#999;font-size:11px;">EmergencyResponsePH — You received this because daily digest email is enabled in your settings.</p>
          </div>`;

        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: "EmergencyResponsePH <notifications@resend.dev>",
              to: [userEmail],
              subject: `📋 Daily Digest: ${notifCount} missed notification${notifCount > 1 ? "s" : ""}`,
              html: emailHtml,
            }),
          });
        } catch (e) {
          console.error("Email digest failed:", e);
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

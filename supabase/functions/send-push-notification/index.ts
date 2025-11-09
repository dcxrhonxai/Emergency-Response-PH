import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, title, body, data } = await req.json();

    // Get user's FCM token from profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('fcm_token')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw new Error('Failed to fetch user profile');
    }

    if (!profile?.fcm_token) {
      console.log('No FCM token for user:', userId);
      return new Response(
        JSON.stringify({ message: 'No FCM token found for user' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Here you would integrate with FCM to send the push notification
    // This is a placeholder for the actual FCM integration
    console.log('Sending push notification to:', profile.fcm_token);
    console.log('Title:', title);
    console.log('Body:', body);
    console.log('Data:', data);

    // Example FCM API call (requires FCM_SERVER_KEY secret)
    // const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY');
    // if (FCM_SERVER_KEY) {
    //   const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
    //     method: 'POST',
    //     headers: {
    //       'Authorization': `key=${FCM_SERVER_KEY}`,
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({
    //       to: profile.fcm_token,
    //       notification: {
    //         title,
    //         body,
    //       },
    //       data: data || {},
    //     }),
    //   });
    //
    //   const fcmData = await fcmResponse.json();
    //   console.log('FCM response:', fcmData);
    // }

    return new Response(
      JSON.stringify({ success: true, message: 'Push notification queued' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

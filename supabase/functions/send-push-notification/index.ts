import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FCMMessage {
  to: string;
  notification: {
    title: string;
    body: string;
    icon?: string;
    click_action?: string;
  };
  data?: Record<string, any>;
  priority?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, title, body, data, tokens } = await req.json();
    
    const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY');
    
    if (!FCM_SERVER_KEY) {
      console.error('FCM_SERVER_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'FCM not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let fcmTokens: string[] = [];

    // If specific tokens provided, use those
    if (tokens && Array.isArray(tokens)) {
      fcmTokens = tokens.filter(Boolean);
    } else if (userId) {
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

      if (profile?.fcm_token) {
        fcmTokens = [profile.fcm_token];
      }
    }

    if (fcmTokens.length === 0) {
      console.log('No FCM tokens to send to');
      return new Response(
        JSON.stringify({ message: 'No FCM tokens found', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending push notification to ${fcmTokens.length} device(s)`);
    console.log('Title:', title);
    console.log('Body:', body);

    const results = [];

    for (const token of fcmTokens) {
      const message: FCMMessage = {
        to: token,
        notification: {
          title,
          body,
          icon: '/pwa-192x192.png',
          click_action: 'https://fcbb65b3-90f2-4418-90e8-a8de327e1a60.lovableproject.com',
        },
        data: data || {},
        priority: 'high',
      };

      try {
        const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Authorization': `key=${FCM_SERVER_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        });

        const fcmData = await fcmResponse.json();
        console.log('FCM response for token:', token.substring(0, 20) + '...', fcmData);
        
        results.push({
          token: token.substring(0, 20) + '...',
          success: fcmData.success === 1,
          error: fcmData.results?.[0]?.error,
        });

        // If token is invalid, remove it from the profile
        if (fcmData.results?.[0]?.error === 'InvalidRegistration' || 
            fcmData.results?.[0]?.error === 'NotRegistered') {
          console.log('Removing invalid FCM token');
          await supabaseClient
            .from('profiles')
            .update({ fcm_token: null })
            .eq('fcm_token', token);
        }
      } catch (err) {
        console.error('FCM send error:', err);
        results.push({
          token: token.substring(0, 20) + '...',
          success: false,
          error: String(err),
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Push notifications sent: ${successCount}/${fcmTokens.length}`,
        results,
      }),
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  event_type: 'alert_created' | 'alert_resolved' | 'alert_escalated' | 'location_updated';
  alert_id?: string;
  user_id: string;
  data: Record<string, unknown>;
  timestamp: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { webhook_url, payload } = await req.json() as {
      webhook_url: string;
      payload: WebhookPayload;
    };

    if (!webhook_url || !payload) {
      console.error('Missing webhook_url or payload');
      return new Response(
        JSON.stringify({ error: 'Missing webhook_url or payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending webhook to ${webhook_url} with event: ${payload.event_type}`);

    // Sign the payload for verification
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(payload));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Send the webhook
    const response = await fetch(webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Emergency-Signature': signature,
        'X-Emergency-Event': payload.event_type,
        'X-Emergency-Timestamp': payload.timestamp,
      },
      body: JSON.stringify(payload),
    });

    const responseStatus = response.status;
    const responseText = await response.text();

    console.log(`Webhook response: ${responseStatus} - ${responseText.substring(0, 200)}`);

    // Log the webhook delivery attempt
    const { error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        webhook_url: webhook_url.substring(0, 255),
        event_type: payload.event_type,
        payload: payload,
        response_status: responseStatus,
        response_body: responseText.substring(0, 1000),
        user_id: payload.user_id,
      });

    if (logError) {
      console.error('Failed to log webhook:', logError);
    }

    return new Response(
      JSON.stringify({
        success: responseStatus >= 200 && responseStatus < 300,
        status: responseStatus,
        message: responseStatus >= 200 && responseStatus < 300 
          ? 'Webhook delivered successfully' 
          : 'Webhook delivery failed',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

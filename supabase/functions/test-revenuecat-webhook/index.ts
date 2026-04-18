// Temporary self-test for revenuecat-webhook. Invokes the webhook with the
// real REVENUECAT_WEBHOOK_AUTH (only available server-side) and a synthetic
// INITIAL_PURCHASE event for the given app_user_id.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { app_user_id, product_id = 'premium_monthly', event_type = 'INITIAL_PURCHASE' } =
      await req.json();

    const auth = Deno.env.get('REVENUECAT_WEBHOOK_AUTH')!;
    const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/revenuecat-webhook`;

    const now = Date.now();
    const payload = {
      api_version: '1.0',
      event: {
        type: event_type,
        app_user_id,
        product_id,
        period_type: 'NORMAL',
        purchased_at_ms: now,
        expiration_at_ms: now + 30 * 24 * 60 * 60 * 1000,
        store: 'PLAY_STORE',
        environment: 'SANDBOX',
        transaction_id: `test_txn_${now}`,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify(payload),
    });
    const text = await res.text();

    return new Response(JSON.stringify({ status: res.status, body: text }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

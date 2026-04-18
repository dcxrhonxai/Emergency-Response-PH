import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// RevenueCat webhook event types we care about
type RCEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'PRODUCT_CHANGE'
  | 'CANCELLATION'
  | 'UNCANCELLATION'
  | 'NON_RENEWING_PURCHASE'
  | 'EXPIRATION'
  | 'BILLING_ISSUE'
  | 'SUBSCRIBER_ALIAS'
  | 'SUBSCRIPTION_PAUSED'
  | 'TRANSFER'
  | 'TEST';

interface RCEvent {
  type: RCEventType;
  app_user_id: string;
  original_app_user_id?: string;
  product_id: string;
  period_type?: string;
  purchased_at_ms?: number;
  expiration_at_ms?: number | null;
  store?: string;
  environment?: 'SANDBOX' | 'PRODUCTION';
  transaction_id?: string;
  original_transaction_id?: string;
  cancel_reason?: string;
}

interface RCWebhookPayload {
  event: RCEvent;
  api_version: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verify the Authorization header matches our shared secret
    const expectedAuth = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');
    const incomingAuth = req.headers.get('authorization') ?? req.headers.get('Authorization');

    if (!expectedAuth) {
      console.error('REVENUECAT_WEBHOOK_AUTH secret not configured');
      return new Response(JSON.stringify({ error: 'Server not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (incomingAuth !== expectedAuth) {
      console.warn('Unauthorized webhook attempt. Got:', incomingAuth?.substring(0, 12));
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse payload
    const payload = (await req.json()) as RCWebhookPayload;
    const event = payload?.event;

    if (!event || !event.type) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`RevenueCat event received: ${event.type} for user ${event.app_user_id}`);

    // 3. TEST events from RevenueCat dashboard — acknowledge and exit
    if (event.type === 'TEST') {
      return new Response(
        JSON.stringify({ success: true, message: 'Test event received' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const userId = event.app_user_id;
    const productId = event.product_id;
    const purchaseToken = event.transaction_id ?? event.original_transaction_id ?? `rc_${Date.now()}`;
    const platform = (event.store ?? 'unknown').toLowerCase();
    const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
    const purchasedAt = event.purchased_at_ms ? new Date(event.purchased_at_ms).toISOString() : new Date().toISOString();

    // 4. Determine premium status & subscription status from event type
    let isPremium = false;
    let status = 'active';
    let cancelledAt: string | null = null;

    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
      case 'PRODUCT_CHANGE':
      case 'NON_RENEWING_PURCHASE':
      case 'TRANSFER':
        isPremium = true;
        status = 'active';
        break;
      case 'CANCELLATION':
        // user cancelled but still has access until expires_at
        isPremium = expiresAt ? new Date(expiresAt) > new Date() : false;
        status = 'cancelled';
        cancelledAt = new Date().toISOString();
        break;
      case 'EXPIRATION':
        isPremium = false;
        status = 'expired';
        break;
      case 'BILLING_ISSUE':
        isPremium = false;
        status = 'billing_issue';
        break;
      case 'SUBSCRIPTION_PAUSED':
        isPremium = false;
        status = 'paused';
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // 5. Upsert subscription row (one row per user_id + product_id)
    const { error: upsertError } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          product_id: productId,
          purchase_token: purchaseToken,
          platform,
          is_premium: isPremium,
          status,
          purchased_at: purchasedAt,
          expires_at: expiresAt,
          cancelled_at: cancelledAt,
          last_validated_at: new Date().toISOString(),
          metadata: { last_event: event.type, environment: event.environment, store: event.store },
        },
        { onConflict: 'user_id,product_id' }
      );

    if (upsertError) {
      console.error('Subscription upsert failed:', upsertError);
      return new Response(JSON.stringify({ error: upsertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Subscription synced: user=${userId} premium=${isPremium} status=${status}`);

    return new Response(
      JSON.stringify({ success: true, user_id: userId, is_premium: isPremium, status }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

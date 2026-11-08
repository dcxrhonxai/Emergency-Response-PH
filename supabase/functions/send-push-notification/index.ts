import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/firebase_messaging';

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return jsonResponse({ error: 'Unauthorized' }, 401);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const connectionApiKey = Deno.env.get('FIREBASE_MESSAGING_API_KEY');

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !lovableApiKey || !connectionApiKey) {
      console.error('Push notification service configuration is incomplete');
      return jsonResponse({ error: 'Push notification service is not configured' }, 503);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const jwt = authorization.slice('Bearer '.length);
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(jwt);
    const authenticatedUserId = claimsData?.claims?.sub;
    if (claimsError || typeof authenticatedUserId !== 'string') {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return jsonResponse({ error: 'Invalid request body' }, 400);
    }

    const { userId, title, body: messageBody, data } = body as Record<string, unknown>;
    if (userId !== authenticatedUserId) return jsonResponse({ error: 'Forbidden' }, 403);
    if (typeof title !== 'string' || title.trim().length === 0 || title.length > 100) {
      return jsonResponse({ error: 'Title must be between 1 and 100 characters' }, 400);
    }
    if (typeof messageBody !== 'string' || messageBody.trim().length === 0 || messageBody.length > 240) {
      return jsonResponse({ error: 'Message must be between 1 and 240 characters' }, 400);
    }

    const messageData: Record<string, string> = {};
    if (data !== undefined) {
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return jsonResponse({ error: 'Notification data must be an object of text values' }, 400);
      }
      const entries = Object.entries(data as Record<string, unknown>);
      if (entries.length > 20 || entries.some(([key, value]) =>
        !/^[a-zA-Z0-9_]{1,40}$/.test(key) ||
        /^(from|message_type|notification|google\.|gcm\.|collapse_key)/i.test(key) ||
        typeof value !== 'string' || value.length > 500
      )) {
        return jsonResponse({ error: 'Notification data contains an invalid field' }, 400);
      }
      for (const [key, value] of entries) messageData[key] = value as string;
    }
    messageData.title = title.trim();
    messageData.body = messageBody.trim();

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('fcm_token')
      .eq('id', authenticatedUserId)
      .maybeSingle();

    if (profileError) {
      console.error('Could not load the signed-in user notification token:', profileError.message);
      return jsonResponse({ error: 'Could not load this device registration' }, 500);
    }
    if (!profile?.fcm_token) {
      return jsonResponse({ sent: 0, reason: 'device_not_registered' });
    }

    const response = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        'X-Connection-Api-Key': connectionApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: profile.fcm_token,
          data: messageData,
          webpush: { headers: { Urgency: 'high' } },
        },
      }),
    });

    const responseText = await response.text();
    if (!response.ok) {
      let providerStatus = '';
      try {
        const parsed = JSON.parse(responseText);
        providerStatus = parsed?.error?.status || '';
      } catch {
        // Preserve the original provider response below.
      }

      if (response.status === 404 || (response.status === 400 && providerStatus === 'INVALID_ARGUMENT')) {
        await adminClient.from('profiles').update({ fcm_token: null }).eq('id', authenticatedUserId);
        return jsonResponse({ sent: 0, reason: 'device_registration_expired' });
      }

      console.error(`Firebase message send failed [${response.status}]: ${responseText}`);
      return jsonResponse({ error: 'Firebase could not send this notification', status: response.status, details: responseText }, response.status);
    }

    return jsonResponse({ sent: 1 });
  } catch (error) {
    console.error('Error in send-push-notification:', error);
    return jsonResponse({ error: 'Could not send the push notification' }, 500);
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization header" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { integration_id, path = "", method = "GET", body, headers: extraHeaders } =
      await req.json();

    if (!integration_id) return json({ error: "integration_id is required" }, 400);

    const { data: integration, error: dbError } = await supabase
      .from("third_party_integrations")
      .select("*")
      .eq("id", integration_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (dbError || !integration) return json({ error: "Integration not found" }, 404);
    if (!integration.is_active) return json({ error: "Integration is disabled" }, 400);

    // Build URL safely
    let url: URL;
    try {
      url = new URL(path || "", integration.base_url);
    } catch {
      return json({ error: "Invalid base_url or path" }, 400);
    }
    // Only allow http(s)
    if (!["http:", "https:"].includes(url.protocol)) {
      return json({ error: "Only http(s) URLs are allowed" }, 400);
    }

    const outHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...(integration.default_headers || {}),
      ...(extraHeaders || {}),
    };

    switch (integration.auth_type) {
      case "bearer":
        if (integration.credential) outHeaders["Authorization"] = `Bearer ${integration.credential}`;
        break;
      case "api_key":
        if (integration.credential)
          outHeaders[integration.auth_header_name || "X-API-Key"] = integration.credential;
        break;
      case "basic":
        if (integration.credential) outHeaders["Authorization"] = `Basic ${integration.credential}`;
        break;
    }

    const started = Date.now();
    let upstreamStatus = 0;
    let responseText = "";
    let ok = false;

    try {
      const upstream = await fetch(url.toString(), {
        method,
        headers: outHeaders,
        body: method === "GET" || method === "HEAD" ? undefined : JSON.stringify(body ?? {}),
      });
      upstreamStatus = upstream.status;
      responseText = (await upstream.text()).slice(0, 4000);
      ok = upstream.ok;
    } catch (e) {
      responseText = e instanceof Error ? e.message : String(e);
    }

    await supabase
      .from("third_party_integrations")
      .update({
        last_tested_at: new Date().toISOString(),
        last_test_status: ok ? `ok:${upstreamStatus}` : `error:${upstreamStatus || "network"}`,
      })
      .eq("id", integration.id);

    return json({
      ok,
      status: upstreamStatus,
      duration_ms: Date.now() - started,
      response: responseText,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return json({ error: message }, 500);
  }
});

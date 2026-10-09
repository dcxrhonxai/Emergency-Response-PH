import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Please sign in." }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Please sign in." }, 401);

    const { situation, contactName, hasLocation } = await req.json();
    const text = String(situation ?? "").trim().slice(0, 1000);
    if (!text) return json({ error: "Describe your situation first." }, 400);
    const name = String(contactName ?? "").slice(0, 80);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI is not configured." }, 500);

    const instructions =
      `You write urgent SMS messages from a person in distress to their trusted contact "${name}". ` +
      "Rewrite the person's description into one calm, clear message under 300 characters: greet the contact by name, " +
      "say what is happening, and say what help is needed. Do not invent facts, places or links. " +
      (hasLocation
        ? "Mention that their live location link follows. "
        : "Mention their location is currently unavailable. ") +
      "Output only the message text.";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      signal: req.signal,
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        instructions,
        input: text,
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
      }),
    });

    if (!res.ok || !res.body) {
      let msg = "Couldn't draft the message right now.";
      try { const e = await res.json(); msg = e?.error?.message || e?.message || msg; } catch { /* ignore */ }
      if (res.status === 429) msg = "Too many requests — please try again shortly.";
      if (res.status === 402) msg = "AI credits are used up for this workspace.";
      return json({ error: msg }, res.status);
    }

    // Consume SSE stream and collect output text
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let draft = "";
    let failed: string | null = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const evt = JSON.parse(data);
          if (evt.type === "response.output_text.delta") draft += evt.delta ?? "";
          if (evt.type === "response.failed" || evt.type === "error")
            failed = evt.response?.error?.message || evt.message || "Drafting failed.";
        } catch { /* partial */ }
      }
    }
    if (failed) return json({ error: failed }, 502);
    draft = draft.trim();
    if (!draft) return json({ error: "The AI couldn't draft a message. You can write your own." }, 502);
    return json({ draft: draft.slice(0, 500) });
  } catch (e) {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    console.error("draft-help-message error", e);
    return json({ error: "Couldn't draft the message right now." }, 500);
  }
});

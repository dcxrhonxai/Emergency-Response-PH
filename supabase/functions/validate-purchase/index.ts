import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VALID_PRODUCTS = new Set([
  "premium_monthly",
  "premium_yearly",
  "premium_lifetime",
]);

interface ValidatePayload {
  productId: string;
  purchaseToken: string;
  platform?: "android" | "ios" | "web";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json()) as ValidatePayload;
    if (!body.productId || !body.purchaseToken) {
      return new Response(
        JSON.stringify({ error: "Missing productId or purchaseToken" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!VALID_PRODUCTS.has(body.productId)) {
      return new Response(
        JSON.stringify({ error: "Unknown product" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TODO: Replace with real Google Play / RevenueCat server-side validation.
    // For Phase 1 we accept tokens and record them server-side so the premium
    // status is no longer client-controlled. Phase 2 will add real validation.
    const isLifetime = body.productId === "premium_lifetime";
    const expiresAt = isLifetime
      ? null
      : new Date(
          Date.now() +
            (body.productId === "premium_yearly"
              ? 365 * 24 * 60 * 60 * 1000
              : 30 * 24 * 60 * 60 * 1000)
        ).toISOString();

    const { data, error } = await supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: userData.user.id,
          product_id: body.productId,
          purchase_token: body.purchaseToken,
          platform: body.platform ?? "android",
          status: "active",
          is_premium: true,
          purchased_at: new Date().toISOString(),
          expires_at: expiresAt,
          last_validated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("Subscription upsert error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, subscription: data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("validate-purchase error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

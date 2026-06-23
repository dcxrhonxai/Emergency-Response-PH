import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BUCKETS = ["emergency-photos", "emergency-videos", "emergency-audio"];
const PAGE_SIZE = 1000;

interface CleanupResult {
  retentionDays: number | null;
  deletedCount: number;
  cutoff: string | null;
  buckets: Record<string, number>;
}

async function cleanupForUser(userId: string, retentionDays: number): Promise<CleanupResult> {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const result: CleanupResult = {
    retentionDays,
    deletedCount: 0,
    cutoff: cutoff.toISOString(),
    buckets: {},
  };

  for (const bucket of BUCKETS) {
    let offset = 0;
    let bucketDeleted = 0;

    while (true) {
      const { data, error } = await admin.storage.from(bucket).list(userId, {
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) {
        console.error(`list ${bucket}/${userId} failed`, error);
        break;
      }
      if (!data || data.length === 0) break;

      const toDelete: string[] = [];
      for (const obj of data) {
        // Storage objects expose `created_at`; fall back to name-encoded
        // timestamp (we save files as `${userId}/${Date.now()}-rand.ext`).
        let createdAt: Date | null = null;
        if (obj.created_at) {
          createdAt = new Date(obj.created_at);
        } else {
          const ts = parseInt(obj.name.split("-")[0], 10);
          if (Number.isFinite(ts)) createdAt = new Date(ts);
        }
        if (createdAt && createdAt < cutoff) {
          toDelete.push(`${userId}/${obj.name}`);
        }
      }

      if (toDelete.length > 0) {
        const { error: removeError } = await admin.storage.from(bucket).remove(toDelete);
        if (removeError) {
          console.error(`remove ${bucket} failed`, removeError);
        } else {
          bucketDeleted += toDelete.length;
        }
      }

      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    result.buckets[bucket] = bucketDeleted;
    result.deletedCount += bucketDeleted;
  }

  await admin
    .from("evidence_retention_settings")
    .update({ last_cleanup_at: new Date().toISOString() })
    .eq("user_id", userId);

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Identify the calling user via their JWT.
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Read this user's retention setting (RLS-scoped via their JWT).
    const { data: settings, error: settingsError } = await userClient
      .from("evidence_retention_settings")
      .select("retention_days")
      .eq("user_id", userId)
      .maybeSingle();

    if (settingsError) {
      return new Response(JSON.stringify({ error: settingsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const retentionDays = settings?.retention_days ?? null;
    if (!retentionDays || retentionDays <= 0) {
      return new Response(
        JSON.stringify({
          retentionDays: null,
          deletedCount: 0,
          skipped: true,
          reason: "No retention window configured",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await cleanupForUser(userId, retentionDays);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("cleanup-expired-evidence error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

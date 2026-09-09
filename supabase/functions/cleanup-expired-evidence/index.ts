import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BUCKETS = ["emergency-photos", "emergency-videos", "emergency-audio"];
const PAGE_SIZE = 1000;

type RetentionMap = Record<string, number>;

interface EvidenceItem {
  bucket: string;
  path: string;
  name: string;
  createdAt: string | null;
  size: number | null;
}

interface CleanupResult {
  retentionDays: number | null;
  retentionByType?: RetentionMap;
  deletedCount: number;
  cutoff: string | null;
  cutoffs?: Record<string, string>;
  buckets: Record<string, number>;
  dryRun?: boolean;
  items?: EvidenceItem[];
}

async function collectExpiredForUser(
  userId: string,
  retention: RetentionMap
): Promise<{
  cutoff: Date;
  cutoffs: Record<string, string>;
  buckets: Record<string, EvidenceItem[]>;
}> {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const activeDays = BUCKETS.map((b) => retention[b]).filter(
    (d) => typeof d === "number" && d > 0
  );
  const widest = activeDays.length ? Math.max(...activeDays) : 0;
  const cutoff = new Date(Date.now() - widest * 24 * 60 * 60 * 1000);
  const cutoffs: Record<string, string> = {};
  const buckets: Record<string, EvidenceItem[]> = {};

  for (const bucket of BUCKETS) {
    const expired: EvidenceItem[] = [];
    const days = retention[bucket];
    if (!days || days <= 0) {
      buckets[bucket] = expired;
      continue;
    }
    const bucketCutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    cutoffs[bucket] = bucketCutoff.toISOString();
    let offset = 0;
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

      for (const obj of data) {
        let createdAt: Date | null = null;
        if (obj.created_at) {
          createdAt = new Date(obj.created_at);
        } else {
          const ts = parseInt(obj.name.split("-")[0], 10);
          if (Number.isFinite(ts)) createdAt = new Date(ts);
        }
        if (createdAt && createdAt < bucketCutoff) {
          expired.push({
            bucket,
            path: `${userId}/${obj.name}`,
            name: obj.name,
            createdAt: createdAt.toISOString(),
            size: (obj.metadata as { size?: number } | null)?.size ?? null,
          });
        }
      }

      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
    buckets[bucket] = expired;
  }

  return { cutoff, buckets };
}

async function previewForUser(userId: string, retentionDays: number): Promise<CleanupResult> {
  const { cutoff, buckets } = await collectExpiredForUser(userId, retentionDays);
  const result: CleanupResult = {
    retentionDays,
    deletedCount: 0,
    cutoff: cutoff.toISOString(),
    buckets: {},
    dryRun: true,
    items: [],
  };
  for (const [bucket, items] of Object.entries(buckets)) {
    result.buckets[bucket] = items.length;
    result.deletedCount += items.length;
    result.items!.push(...items);
  }
  return result;
}

async function cleanupForUser(userId: string, retentionDays: number): Promise<CleanupResult> {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { cutoff, buckets } = await collectExpiredForUser(userId, retentionDays);
  const result: CleanupResult = {
    retentionDays,
    deletedCount: 0,
    cutoff: cutoff.toISOString(),
    buckets: {},
  };

  for (const [bucket, items] of Object.entries(buckets)) {
    let bucketDeleted = 0;
    if (items.length > 0) {
      const { error: removeError } = await admin.storage
        .from(bucket)
        .remove(items.map((i) => i.path));
      if (removeError) {
        console.error(`remove ${bucket} failed`, removeError);
      } else {
        bucketDeleted = items.length;
      }
    }
    result.buckets[bucket] = bucketDeleted;
    result.deletedCount += bucketDeleted;
  }

  await admin
    .from("evidence_retention_settings")
    .update({ last_cleanup_at: new Date().toISOString() })
    .eq("user_id", userId);

  await admin.from("evidence_cleanup_history").insert({
    user_id: userId,
    retention_days: retentionDays,
    deleted_count: result.deletedCount,
    buckets: result.buckets,
    cutoff: result.cutoff,
    skipped: false,
  });

  return result;
}

async function logSkipped(userId: string, reason: string) {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  await admin.from("evidence_cleanup_history").insert({
    user_id: userId,
    retention_days: null,
    deleted_count: 0,
    skipped: true,
    reason,
  });
}

async function logError(userId: string, error: string) {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  await admin.from("evidence_cleanup_history").insert({
    user_id: userId,
    deleted_count: 0,
    skipped: false,
    error,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let userId: string | null = null;
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
    userId = userData.user.id;

    // Parse optional { dryRun, retentionDays } body — dry runs may preview
    // a different window than the one that's saved.
    let dryRun = false;
    let overrideDays: number | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        dryRun = body?.dryRun === true;
        if (typeof body?.retentionDays === "number" && body.retentionDays > 0) {
          overrideDays = Math.floor(body.retentionDays);
        }
      } catch {
        // no body — fine
      }
    }

    let retentionDays: number | null = overrideDays;
    if (retentionDays === null) {
      const { data: settings, error: settingsError } = await userClient
        .from("evidence_retention_settings")
        .select("retention_days")
        .eq("user_id", userId)
        .maybeSingle();

      if (settingsError) {
        if (!dryRun) await logError(userId, settingsError.message);
        return new Response(JSON.stringify({ error: settingsError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      retentionDays = settings?.retention_days ?? null;
    }

    if (!retentionDays || retentionDays <= 0) {
      if (!dryRun) await logSkipped(userId, "No retention window configured");
      return new Response(
        JSON.stringify({
          retentionDays: null,
          deletedCount: 0,
          skipped: true,
          dryRun,
          reason: "No retention window configured",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = dryRun
      ? await previewForUser(userId, retentionDays)
      : await cleanupForUser(userId, retentionDays);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("cleanup-expired-evidence error", err);
    const message = (err as Error).message;
    if (userId) await logError(userId, message).catch(() => {});
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

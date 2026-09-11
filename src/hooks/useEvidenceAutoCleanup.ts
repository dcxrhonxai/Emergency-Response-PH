import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const STORAGE_KEY = "evidence_cleanup_last_attempt";

interface CleanupResponse {
  deletedCount?: number;
  skipped?: boolean;
  reason?: string;
  buckets?: Record<string, number>;
  error?: string;
}

/**
 * Triggers the evidence retention cleanup edge function at most once every
 * 24 hours per device. When the user has cleanup notifications enabled, the
 * outcome is surfaced as an in-app toast (deletions and errors only — a
 * no-op run stays silent so the app doesn't nag on every cold start).
 */
export const useEvidenceAutoCleanup = () => {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const lastAttempt = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
        if (Number.isFinite(lastAttempt) && Date.now() - lastAttempt < ONE_DAY_MS) {
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        // Bail early when the user has no retention configured so we don't
        // burn an unnecessary function invocation on every cold start.
        const { data: settings } = await supabase
          .from("evidence_retention_settings")
          .select(
            "retention_days, photo_retention_days, video_retention_days, audio_retention_days, notify_on_cleanup"
          )
          .eq("user_id", user.id)
          .maybeSingle();
        if (cancelled) return;
        const fallback = settings?.retention_days ?? null;
        const effective = [
          settings?.photo_retention_days ?? fallback,
          settings?.video_retention_days ?? fallback,
          settings?.audio_retention_days ?? fallback,
        ];
        if (!effective.some((d) => typeof d === "number" && d > 0)) {
          localStorage.setItem(STORAGE_KEY, String(Date.now()));
          return;
        }

        const notify = settings?.notify_on_cleanup !== false;
        localStorage.setItem(STORAGE_KEY, String(Date.now()));

        const { data, error } = await supabase.functions.invoke<CleanupResponse>(
          "cleanup-expired-evidence"
        );
        if (cancelled) return;

        if (error) {
          console.warn("auto evidence cleanup failed", error);
          if (notify) {
            toast.error("Automatic evidence cleanup failed", {
              description: error.message,
              duration: 8000,
            });
          }
          return;
        }

        if (data?.skipped) return;

        const count = data?.deletedCount ?? 0;
        if (count > 0 && notify) {
          const breakdown = Object.entries(data?.buckets ?? {})
            .filter(([, n]) => n > 0)
            .map(([bucket, n]) => `${n} ${bucket.replace("emergency-", "")}`)
            .join(", ");
          toast.success(
            `Automatic cleanup removed ${count} expired evidence file(s).`,
            {
              description: breakdown || undefined,
              duration: 8000,
            }
          );
        }
      } catch (err) {
        console.warn("useEvidenceAutoCleanup error", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);
};

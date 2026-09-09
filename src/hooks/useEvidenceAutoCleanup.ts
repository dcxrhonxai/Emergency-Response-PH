import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const STORAGE_KEY = "evidence_cleanup_last_attempt";

/**
 * Silently triggers the evidence retention cleanup edge function at most
 * once every 24 hours per device. Safe to mount once at the app shell —
 * the edge function is a no-op when the user has no retention window set.
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
            "retention_days, photo_retention_days, video_retention_days, audio_retention_days"
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

        localStorage.setItem(STORAGE_KEY, String(Date.now()));
        // Fire-and-forget — failures here must never surface to the user.
        supabase.functions
          .invoke("cleanup-expired-evidence")
          .catch((err) => console.warn("auto evidence cleanup failed", err));
      } catch (err) {
        console.warn("useEvidenceAutoCleanup error", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);
};

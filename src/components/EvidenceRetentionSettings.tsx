import { useEffect, useState } from "react";
import { Clock, Eye, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface RetentionRow {
  retention_days: number | null;
  photo_retention_days: number | null;
  video_retention_days: number | null;
  audio_retention_days: number | null;
  last_cleanup_at: string | null;
}

const PRESETS: Array<{ value: string; label: string; days: number | null }> = [
  { value: "never", label: "Keep forever", days: null },
  { value: "1", label: "1 day", days: 1 },
  { value: "7", label: "7 days", days: 7 },
  { value: "30", label: "30 days", days: 30 },
  { value: "90", label: "90 days", days: 90 },
  { value: "365", label: "1 year", days: 365 },
];

const presetForDays = (days: number | null): string => {
  if (days === null) return "never";
  const match = PRESETS.find((p) => p.days === days);
  return match ? match.value : "custom";
};

type TypeKey = "photo" | "video" | "audio";

const TYPE_FIELDS: Array<{ key: TypeKey; label: string; column: keyof RetentionRow }> = [
  { key: "photo", label: "Photos", column: "photo_retention_days" },
  { key: "video", label: "Videos", column: "video_retention_days" },
  { key: "audio", label: "Audio recordings", column: "audio_retention_days" },
];

const typePresetValue = (days: number | null | undefined): string =>
  days === null || days === undefined ? "default" : presetForDays(days);

interface PreviewItem {
  bucket: string;
  path: string;
  name: string;
  createdAt: string | null;
  size: number | null;
}

interface PreviewResult {
  retentionDays: number | null;
  deletedCount: number;
  cutoff: string | null;
  buckets: Record<string, number>;
  items: PreviewItem[];
  skipped?: boolean;
  reason?: string;
}

const formatSize = (bytes: number | null): string => {
  if (bytes === null || !Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const EvidenceRetentionSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [retentionDays, setRetentionDays] = useState<number | null>(null);
  const [lastCleanupAt, setLastCleanupAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("evidence_retention_settings")
        .select("retention_days, last_cleanup_at")
        .eq("user_id", user.id)
        .maybeSingle<RetentionRow>();
      if (!cancelled) {
        if (!error && data) {
          setRetentionDays(data.retention_days);
          setLastCleanupAt(data.last_cleanup_at);
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveRetention = async (nextDays: number | null) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be signed in.");
        return;
      }
      const { error } = await supabase
        .from("evidence_retention_settings")
        .upsert(
          { user_id: user.id, retention_days: nextDays },
          { onConflict: "user_id" }
        );
      if (error) {
        toast.error(`Could not save: ${error.message}`);
        return;
      }
      setRetentionDays(nextDays);
      toast.success(
        nextDays === null
          ? "Evidence will be kept indefinitely."
          : `Evidence older than ${nextDays} day(s) will be deleted automatically.`
      );
    } finally {
      setSaving(false);
    }
  };

  const runCleanupNow = async () => {
    setCleaning(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        deletedCount?: number;
        skipped?: boolean;
        reason?: string;
      }>("cleanup-expired-evidence");
      if (error) {
        toast.error(`Cleanup failed: ${error.message}`);
        return;
      }
      if (data?.skipped) {
        toast.info(data.reason || "No retention window configured.");
        return;
      }
      const count = data?.deletedCount ?? 0;
      toast.success(
        count === 0
          ? "Nothing to delete — no evidence is past its retention window."
          : `Deleted ${count} expired evidence file(s).`
      );
      setLastCleanupAt(new Date().toISOString());
    } finally {
      setCleaning(false);
    }
  };

  const runDryRun = async () => {
    setPreviewing(true);
    try {
      const { data, error } = await supabase.functions.invoke<PreviewResult>(
        "cleanup-expired-evidence",
        { body: { dryRun: true } }
      );
      if (error) {
        toast.error(`Preview failed: ${error.message}`);
        return;
      }
      if (data?.skipped) {
        toast.info(data.reason || "No retention window configured.");
        return;
      }
      setPreview(data ?? null);
      setPreviewOpen(true);
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Evidence Retention
        </CardTitle>
        <CardDescription>
          Choose how long captured evidence (photos, videos, audio) is kept in
          secure storage. Anything older than your chosen window is deleted
          automatically the next time you open the app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="retention-window">Retention window</Label>
          <Select
            value={loading ? undefined : presetForDays(retentionDays)}
            onValueChange={(value) => {
              const preset = PRESETS.find((p) => p.value === value);
              if (preset) saveRetention(preset.days);
            }}
            disabled={loading || saving}
          >
            <SelectTrigger id="retention-window">
              <SelectValue placeholder={loading ? "Loading…" : "Select retention period"} />
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {retentionDays === null
              ? "Evidence will be kept indefinitely until you delete it manually."
              : `Files older than ${retentionDays} day(s) will be removed.`}
          </p>
        </div>

        <div className="flex items-center justify-between border-t pt-4 gap-2 flex-wrap">
          <div className="text-xs text-muted-foreground">
            {lastCleanupAt
              ? `Last cleanup: ${new Date(lastCleanupAt).toLocaleString()}`
              : "Cleanup has not run yet."}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={runDryRun}
              disabled={previewing || retentionDays === null}
            >
              {previewing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Previewing…
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview (dry run)
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={runCleanupNow}
              disabled={cleaning || retentionDays === null}
            >
              {cleaning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cleaning…
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Run cleanup now
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dry run preview</DialogTitle>
            <DialogDescription>
              {preview
                ? preview.deletedCount === 0
                  ? "Nothing would be deleted — no evidence is past your retention window."
                  : `${preview.deletedCount} file(s) would be deleted with your current ${preview.retentionDays}-day window. Nothing has been removed.`
                : "Loading preview…"}
            </DialogDescription>
          </DialogHeader>

          {preview && preview.items.length > 0 && (
            <ScrollArea className="h-[360px] pr-2">
              <div className="space-y-1.5">
                {preview.items.map((item) => (
                  <div
                    key={`${item.bucket}/${item.path}`}
                    className="flex items-center justify-between gap-2 text-sm border rounded-md px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.bucket.replace("emergency-", "")} ·{" "}
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleString()
                          : "unknown date"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatSize(item.size)}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
            {preview && preview.deletedCount > 0 && (
              <Button
                variant="destructive"
                onClick={async () => {
                  setPreviewOpen(false);
                  await runCleanupNow();
                }}
                disabled={cleaning}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete these now
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

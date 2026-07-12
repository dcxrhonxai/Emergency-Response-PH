import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, History, Loader2, RefreshCw, SkipForward } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface HistoryRow {
  id: string;
  ran_at: string;
  retention_days: number | null;
  deleted_count: number;
  buckets: Record<string, number> | null;
  cutoff: string | null;
  skipped: boolean;
  reason: string | null;
  error: string | null;
}

export const EvidenceCleanupHistory = () => {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRows([]);
        return;
      }
      const { data } = await supabase
        .from("evidence_cleanup_history")
        .select("id, ran_at, retention_days, deleted_count, buckets, cutoff, skipped, reason, error")
        .eq("user_id", user.id)
        .order("ran_at", { ascending: false })
        .limit(25);
      setRows((data as HistoryRow[] | null) ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const renderStatus = (row: HistoryRow) => {
    if (row.error) {
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
          <AlertCircle className="w-3 h-3 mr-1" /> Error
        </Badge>
      );
    }
    if (row.skipped) {
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground">
          <SkipForward className="w-3 h-3 mr-1" /> Skipped
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
        <CheckCircle2 className="w-3 h-3 mr-1" /> Success
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Cleanup History
            </CardTitle>
            <CardDescription>
              The last 25 evidence-cleanup runs for your account, with any errors.
            </CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No cleanup runs yet.
          </div>
        ) : (
          <ScrollArea className="h-[320px] pr-2">
            <div className="space-y-2">
              {rows.map((row) => (
                <div key={row.id} className="p-3 border rounded-lg text-sm">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      {renderStatus(row)}
                      <span className="text-xs text-muted-foreground">
                        {new Date(row.ran_at).toLocaleString()}
                      </span>
                    </div>
                    {!row.skipped && !row.error && (
                      <span className="font-medium">
                        {row.deleted_count} deleted
                      </span>
                    )}
                  </div>
                  {row.retention_days !== null && (
                    <p className="text-xs text-muted-foreground">
                      Retention window: {row.retention_days} day(s)
                    </p>
                  )}
                  {row.buckets && Object.keys(row.buckets).length > 0 && !row.error && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {Object.entries(row.buckets)
                        .map(([b, n]) => `${b.replace("emergency-", "")}: ${n}`)
                        .join(" · ")}
                    </p>
                  )}
                  {row.reason && (
                    <p className="text-xs text-muted-foreground mt-1">{row.reason}</p>
                  )}
                  {row.error && (
                    <p className="text-xs text-red-500 mt-1 break-words">{row.error}</p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

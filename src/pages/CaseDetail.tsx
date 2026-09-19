import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Loader2, Plus, Trash2, FileImage, FileVideo, FileAudio, AlertCircle, Link2,
  ClipboardList, CheckCircle2, Flag, ExternalLink, Unlink,
} from "lucide-react";
import { toast } from "sonner";

interface CaseRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  severity: string;
  incident_date: string | null;
  created_at: string;
}

interface EvidenceFile {
  type?: string;
  path?: string;
  name?: string;
  size?: number;
}

interface AlertRow {
  id: string;
  emergency_type: string;
  situation: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  evidence_files: EvidenceFile[] | null;
}

interface Finding {
  id: string;
  title: string;
  detail: string | null;
  category: string;
  importance: string;
  recorded_at: string;
}

interface TimelineEvent {
  id: string;
  at: string;
  kind: "case" | "alert" | "evidence" | "finding" | "resolved";
  title: string;
  detail?: string;
}

const BUCKETS: Record<string, string> = {
  photo: "emergency-photos",
  video: "emergency-videos",
  audio: "emergency-audio",
};

const evidenceIcon = (type?: string) => {
  if (type === "video") return FileVideo;
  if (type === "audio") return FileAudio;
  return FileImage;
};

const timelineIcon = (kind: TimelineEvent["kind"]) => {
  if (kind === "alert") return AlertCircle;
  if (kind === "evidence") return FileImage;
  if (kind === "finding") return Flag;
  if (kind === "resolved") return CheckCircle2;
  return ClipboardList;
};

const alertStatusGroup = (status: string | null): "open" | "closed" | "pending" => {
  if (status === "active") return "open";
  if (status === "resolved" || status === "false_alarm") return "closed";
  return "pending";
};

const CaseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [caseRow, setCaseRow] = useState<CaseRow | null>(null);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [availableAlerts, setAvailableAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingFinding, setSavingFinding] = useState(false);
  const [findingOpen, setFindingOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [alertFilter, setAlertFilter] = useState<"all" | "open" | "closed" | "pending">("all");
  const [findingForm, setFindingForm] = useState({
    title: "", detail: "", category: "observation", importance: "normal",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
      else navigate("/auth");
    });
  }, [navigate]);

  useEffect(() => {
    if (userId && id) loadAll();
  }, [userId, id]);

  const filteredAlerts = useMemo(
    () => (alertFilter === "all" ? alerts : alerts.filter((a) => alertStatusGroup(a.status) === alertFilter)),
    [alerts, alertFilter]
  );

  const loadAll = async () => {
    if (!userId || !id) return;
    setLoading(true);

    const [caseRes, linkRes, findingRes] = await Promise.all([
      supabase.from("cases").select("*").eq("id", id).eq("user_id", userId).maybeSingle(),
      supabase
        .from("case_alerts")
        .select("alert_id, emergency_alerts(id, emergency_type, situation, status, created_at, resolved_at, evidence_files)")
        .eq("case_id", id),
      supabase.from("case_findings").select("*").eq("case_id", id).order("recorded_at", { ascending: false }),
    ]);

    if (caseRes.error || !caseRes.data) {
      toast.error("Case not found");
      setLoading(false);
      navigate("/cases");
      return;
    }
    setCaseRow(caseRes.data as CaseRow);

    const linked = (linkRes.data || [])
      .map((r: any) => r.emergency_alerts)
      .filter(Boolean)
      .map((a: any) => ({ ...a, evidence_files: Array.isArray(a.evidence_files) ? a.evidence_files : [] })) as AlertRow[];
    linked.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    setAlerts(linked);
    setFindings((findingRes.data || []) as Finding[]);

    const linkedIds = new Set(linked.map((a) => a.id));
    const { data: mine } = await supabase
      .from("emergency_alerts")
      .select("id, emergency_type, situation, status, created_at, resolved_at, evidence_files")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    setAvailableAlerts(((mine || []) as any[]).filter((a) => !linkedIds.has(a.id)) as AlertRow[]);

    setLoading(false);
  };

  const timeline = useMemo<TimelineEvent[]>(() => {
    if (!caseRow) return [];
    const events: TimelineEvent[] = [
      { id: `case-${caseRow.id}`, at: caseRow.created_at, kind: "case", title: "Case created", detail: caseRow.title },
    ];
    alerts.forEach((a) => {
      events.push({
        id: `alert-${a.id}`,
        at: a.created_at,
        kind: "alert",
        title: `${a.emergency_type} alert raised`,
        detail: a.situation,
      });
      const files = a.evidence_files || [];
      if (files.length) {
        events.push({
          id: `ev-${a.id}`,
          at: a.created_at,
          kind: "evidence",
          title: `${files.length} evidence item${files.length > 1 ? "s" : ""} attached`,
          detail: files.map((f) => f.type || "file").join(", "),
        });
      }
      if (a.resolved_at) {
        events.push({ id: `res-${a.id}`, at: a.resolved_at, kind: "resolved", title: "Alert resolved" });
      }
    });
    findings.forEach((f) => {
      events.push({
        id: `find-${f.id}`,
        at: f.recorded_at,
        kind: "finding",
        title: `Finding: ${f.title}`,
        detail: f.detail || undefined,
      });
    });
    return events.sort((a, b) => +new Date(b.at) - +new Date(a.at));
  }, [caseRow, alerts, findings]);

  const evidenceItems = useMemo(
    () => alerts.flatMap((a) => (a.evidence_files || []).map((f) => ({ ...f, alert: a }))),
    [alerts]
  );

  const updateCase = async (patch: Partial<CaseRow>) => {
    if (!caseRow) return;
    const { error } = await supabase.from("cases").update(patch).eq("id", caseRow.id);
    if (error) return toast.error("Could not update the case");
    setCaseRow({ ...caseRow, ...patch });
  };

  const addFinding = async () => {
    if (!userId || !id) return;
    if (!findingForm.title.trim()) return toast.error("Please add a finding title");
    setSavingFinding(true);
    const { data, error } = await supabase
      .from("case_findings")
      .insert({
        case_id: id,
        user_id: userId,
        title: findingForm.title.trim(),
        detail: findingForm.detail.trim() || null,
        category: findingForm.category,
        importance: findingForm.importance,
      })
      .select("*")
      .single();
    setSavingFinding(false);
    if (error || !data) return toast.error("Could not save the finding");
    setFindings((prev) => [data as Finding, ...prev]);
    setFindingForm({ title: "", detail: "", category: "observation", importance: "normal" });
    setFindingOpen(false);
    toast.success("Finding added");
  };

  const deleteFinding = async (findingId: string) => {
    const { error } = await supabase.from("case_findings").delete().eq("id", findingId);
    if (error) return toast.error("Could not delete the finding");
    setFindings((prev) => prev.filter((f) => f.id !== findingId));
  };

  const linkAlert = async (alertId: string) => {
    if (!userId || !id) return;
    const { error } = await supabase.from("case_alerts").insert({ case_id: id, alert_id: alertId, user_id: userId });
    if (error) return toast.error("Could not add that alert");
    setLinkOpen(false);
    toast.success("Alert added to case");
    loadAll();
  };

  const unlinkAlert = async (alertId: string) => {
    if (!id) return;
    const { error } = await supabase.from("case_alerts").delete().eq("case_id", id).eq("alert_id", alertId);
    if (error) return toast.error("Could not remove that alert");
    toast.success("Alert removed from case");
    loadAll();
  };

  const openEvidence = async (file: EvidenceFile) => {
    const bucket = BUCKETS[file.type || "photo"];
    if (!bucket || !file.path) return toast.error("This file is unavailable");
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(file.path, 300);
    if (error || !data) return toast.error("Could not open this file");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!caseRow) return null;

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/cases")} aria-label="Back to cases">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold">{caseRow.title}</h1>
            <p className="text-xs text-muted-foreground">
              {new Date(caseRow.incident_date || caseRow.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-4">
        <Card>
          <CardContent className="space-y-3 pt-6">
            {caseRow.description && <p className="text-sm text-muted-foreground">{caseRow.description}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={caseRow.status} onValueChange={(v) => updateCase({ status: v })}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Severity</Label>
                <Select value={caseRow.severity} onValueChange={(v) => updateCase({ severity: v })}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>{alerts.length} linked alert{alerts.length === 1 ? "" : "s"}</span>
              <span>{evidenceItems.length} evidence item{evidenceItems.length === 1 ? "" : "s"}</span>
              <span>{findings.length} finding{findings.length === 1 ? "" : "s"}</span>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="timeline">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="findings">Findings</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {(["all", "open", "closed", "pending"] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={alertFilter === f ? "default" : "outline"}
                  className="capitalize"
                  onClick={() => setAlertFilter(f)}
                >
                  {f}
                  <span className="ml-1.5 text-xs opacity-70">
                    {f === "all"
                      ? alerts.length
                      : alerts.filter((a) => alertStatusGroup(a.status) === f).length}
                  </span>
                </Button>
              ))}
            </div>
            {filteredAlerts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {alerts.length === 0
                  ? "No alerts linked to this case yet."
                  : `No ${alertFilter} alerts.`}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredAlerts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2 rounded-md border p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium capitalize">{a.emergency_type}</p>
                        <Badge
                          variant={a.status === "active" ? "destructive" : "secondary"}
                          className="capitalize"
                        >
                          {alertStatusGroup(a.status)}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{a.situation}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleString()}
                        {a.resolved_at && ` · Resolved ${new Date(a.resolved_at).toLocaleString()}`}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => unlinkAlert(a.id)} aria-label="Remove alert from case">
                      <Unlink className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Link2 className="mr-1 h-4 w-4" /> Add alert
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add an alert to this case</DialogTitle>
                    <DialogDescription>Its evidence and timing join this case.</DialogDescription>
                  </DialogHeader>
                  <div className="max-h-72 space-y-2 overflow-y-auto">
                    {availableAlerts.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">No other alerts available.</p>
                    ) : (
                      availableAlerts.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => linkAlert(a.id)}
                          className="w-full rounded-md border p-3 text-left transition-colors hover:bg-accent"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium capitalize">{a.emergency_type}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(a.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="line-clamp-1 text-xs text-muted-foreground">{a.situation}</p>
                        </button>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {timeline.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nothing on the timeline yet.</CardContent></Card>
            ) : (
              <ol className="relative space-y-4 border-l pl-6">
                {timeline.map((e) => {
                  const Icon = timelineIcon(e.kind);
                  return (
                    <li key={e.id} className="relative">
                      <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-secondary">
                        <Icon className="h-3.5 w-3.5 text-secondary-foreground" />
                      </span>
                      <p className="text-sm font-medium capitalize">{e.title}</p>
                      {e.detail && <p className="text-sm text-muted-foreground">{e.detail}</p>}
                      <p className="text-xs text-muted-foreground">{new Date(e.at).toLocaleString()}</p>
                    </li>
                  );
                })}
              </ol>
            )}

            {alerts.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Linked alerts</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {alerts.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium capitalize">{a.emergency_type}</p>
                        <p className="truncate text-xs text-muted-foreground">{a.situation}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => unlinkAlert(a.id)} aria-label="Remove alert from case">
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="findings" className="mt-4 space-y-3">
            <div className="flex justify-end">
              <Dialog open={findingOpen} onOpenChange={setFindingOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add finding</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add a finding</DialogTitle>
                    <DialogDescription>Record what you observed or concluded.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="f-title">Title</Label>
                      <Input
                        id="f-title"
                        value={findingForm.title}
                        onChange={(e) => setFindingForm({ ...findingForm, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="f-detail">Details</Label>
                      <Textarea
                        id="f-detail"
                        value={findingForm.detail}
                        onChange={(e) => setFindingForm({ ...findingForm, detail: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Category</Label>
                        <Select
                          value={findingForm.category}
                          onValueChange={(v) => setFindingForm({ ...findingForm, category: v })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="observation">Observation</SelectItem>
                            <SelectItem value="witness">Witness</SelectItem>
                            <SelectItem value="injury">Injury</SelectItem>
                            <SelectItem value="damage">Damage</SelectItem>
                            <SelectItem value="action">Action taken</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Importance</Label>
                        <Select
                          value={findingForm.importance}
                          onValueChange={(v) => setFindingForm({ ...findingForm, importance: v })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={addFinding} disabled={savingFinding}>
                      {savingFinding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save finding
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {findings.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No findings recorded yet.</CardContent></Card>
            ) : (
              findings.map((f) => (
                <Card key={f.id}>
                  <CardContent className="space-y-2 pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{f.title}</p>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Delete finding">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this finding?</AlertDialogTitle>
                            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteFinding(f.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    {f.detail && <p className="text-sm text-muted-foreground">{f.detail}</p>}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{f.category}</Badge>
                      <Badge variant={f.importance === "high" ? "destructive" : "secondary"}>{f.importance}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(f.recorded_at).toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="evidence" className="mt-4 space-y-3">
            {evidenceItems.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
                No evidence in this case yet. Add an alert to bring its evidence in.
              </CardContent></Card>
            ) : (
              ["photo", "video", "audio"].map((type) => {
                const items = evidenceItems.filter((f) => (f.type || "photo") === type);
                if (items.length === 0) return null;
                const Icon = evidenceIcon(type);
                return (
                  <Card key={type}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm capitalize">
                        <Icon className="h-4 w-4" /> {type}s ({items.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {items.map((f, i) => (
                        <div key={`${f.path}-${i}`} className="flex items-center justify-between gap-2 rounded-md border p-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm">{f.name || f.path?.split("/").pop() || "Evidence file"}</p>
                            <p className="text-xs text-muted-foreground">
                              {f.alert.emergency_type} · {new Date(f.alert.created_at).toLocaleString()}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => openEvidence(f)} aria-label="Open evidence file">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CaseDetail;

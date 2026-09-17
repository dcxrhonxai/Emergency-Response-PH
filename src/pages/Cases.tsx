import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, FolderOpen, Plus, ChevronRight, Loader2, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import { CaseTemplate, fetchCaseTemplates, applyTemplateFindings } from "@/lib/caseTemplates";

interface CaseRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  severity: string;
  incident_date: string | null;
  created_at: string;
}

export const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  if (status === "closed") return "secondary";
  if (status === "investigating") return "default";
  return "outline";
};

const Cases = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", severity: "medium", incident_date: "", status: "open", tags: [] as string[] });
  const [templates, setTemplates] = useState<CaseTemplate[]>([]);
  const [templateId, setTemplateId] = useState("none");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
      else navigate("/auth");
    });
  }, [navigate]);

  useEffect(() => {
    if (userId) loadCases();
  }, [userId, filter]);

  useEffect(() => {
    if (!userId) return;
    fetchCaseTemplates(userId)
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, [userId]);

  const resetForm = () => {
    setForm({ title: "", description: "", severity: "medium", incident_date: "", status: "open", tags: [] });
    setTemplateId("none");
  };

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    if (id === "none") {
      resetForm();
      return;
    }
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setForm((f) => ({
      ...f,
      title: t.title_prefix ? `${t.title_prefix} ` : f.title,
      description: t.description || "",
      severity: t.severity,
      status: t.status,
      tags: t.tags || [],
    }));
  };

  const loadCases = async () => {
    if (!userId) return;
    setLoading(true);
    let query = supabase
      .from("cases")
      .select("id,title,description,status,severity,incident_date,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (filter !== "all") query = query.eq("status", filter);
    const { data, error } = await query;
    if (error) toast.error("Could not load your cases");
    else setCases(data || []);
    setLoading(false);
  };

  const createCase = async () => {
    if (!userId) return;
    if (!form.title.trim()) {
      toast.error("Please add a case title");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("cases")
      .insert({
        user_id: userId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        severity: form.severity,
        status: form.status,
        tags: form.tags,
        incident_date: form.incident_date ? new Date(form.incident_date).toISOString() : null,
      })
      .select("id")
      .single();
    if (error || !data) {
      setSaving(false);
      toast.error("Could not create the case");
      return;
    }

    const template = templates.find((t) => t.id === templateId);
    if (template) {
      try {
        await applyTemplateFindings(
          template,
          data.id,
          userId,
          form.incident_date ? new Date(form.incident_date).toISOString() : new Date().toISOString(),
        );
      } catch {
        toast.error("Case created, but the template's default findings could not be added");
      }
    }

    setSaving(false);
    setOpen(false);
    resetForm();
    toast.success("Case created");
    navigate(`/cases/${data.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Cases</h1>
            <p className="text-xs text-muted-foreground">Group related evidence, timeline and findings</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/cases/templates")}>
            <LayoutTemplate className="mr-1 h-4 w-4" /> Templates
          </Button>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New case</DialogTitle>
                <DialogDescription>Give the case a name so you can group evidence under it.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="case-title">Title</Label>
                  <Input
                    id="case-title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Fire at Barangay 5"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="case-desc">Description</Label>
                  <Textarea
                    id="case-desc"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="What happened?"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Severity</Label>
                    <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="case-date">Incident date</Label>
                    <Input
                      id="case-date"
                      type="datetime-local"
                      value={form.incident_date}
                      onChange={(e) => setForm({ ...form, incident_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={createCase} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create case
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cases</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : cases.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <FolderOpen className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No cases yet. Create one to group related alerts and evidence.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {cases.map((c) => (
              <Card
                key={c.id}
                className="cursor-pointer transition-colors hover:bg-accent/50"
                onClick={() => navigate(`/cases/${c.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{c.title}</CardTitle>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {c.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                    <Badge variant="outline">{c.severity}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.incident_date || c.created_at).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Cases;

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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, LayoutTemplate, Plus, Loader2, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { CaseTemplate, TemplateFinding } from "@/lib/caseTemplates";

const emptyForm = {
  name: "",
  title_prefix: "",
  description: "",
  severity: "medium",
  status: "open",
  tagsText: "",
  default_findings: [] as TemplateFinding[],
};

const CaseTemplates = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<CaseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
      else navigate("/auth");
    });
  }, [navigate]);

  useEffect(() => {
    if (userId) loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadTemplates = async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("case_templates")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) toast.error("Could not load your templates");
    else setTemplates((data || []) as unknown as CaseTemplate[]);
    setLoading(false);
  };

  const startNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setOpen(true);
  };

  const startEdit = (t: CaseTemplate) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      title_prefix: t.title_prefix || "",
      description: t.description || "",
      severity: t.severity,
      status: t.status,
      tagsText: (t.tags || []).join(", "),
      default_findings: Array.isArray(t.default_findings) ? t.default_findings : [],
    });
    setOpen(true);
  };

  const addFinding = () => {
    setForm((f) => ({
      ...f,
      default_findings: [
        ...f.default_findings,
        { title: "", detail: "", category: "observation", importance: "normal" },
      ],
    }));
  };

  const updateFinding = (index: number, patch: Partial<TemplateFinding>) => {
    setForm((f) => ({
      ...f,
      default_findings: f.default_findings.map((x, i) => (i === index ? { ...x, ...patch } : x)),
    }));
  };

  const removeFinding = (index: number) => {
    setForm((f) => ({ ...f, default_findings: f.default_findings.filter((_, i) => i !== index) }));
  };

  const save = async () => {
    if (!userId) return;
    if (!form.name.trim()) {
      toast.error("Please name the template");
      return;
    }
    const findings = form.default_findings
      .filter((f) => f.title.trim())
      .map((f) => ({
        title: f.title.trim(),
        detail: f.detail?.trim() || "",
        category: f.category,
        importance: f.importance,
      }));

    const payload = {
      user_id: userId,
      name: form.name.trim(),
      title_prefix: form.title_prefix.trim() || null,
      description: form.description.trim() || null,
      severity: form.severity,
      status: form.status,
      tags: form.tagsText.split(",").map((t) => t.trim()).filter(Boolean),
      default_findings: findings as unknown as never,
    };

    setSaving(true);
    const { error } = editingId
      ? await supabase.from("case_templates").update(payload).eq("id", editingId)
      : await supabase.from("case_templates").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Could not save the template");
      return;
    }
    toast.success(editingId ? "Template updated" : "Template created");
    setOpen(false);
    setEditingId(null);
    setForm({ ...emptyForm });
    loadTemplates();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("case_templates").delete().eq("id", deleteId);
    setDeleteId(null);
    if (error) {
      toast.error("Could not delete the template");
      return;
    }
    toast.success("Template deleted");
    loadTemplates();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/cases")} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Case templates</h1>
            <p className="text-xs text-muted-foreground">Reusable structures that auto-fill new cases</p>
          </div>
          <Button size="sm" onClick={startNew}>
            <Plus className="mr-1 h-4 w-4" /> New
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-3 px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <LayoutTemplate className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No templates yet. Create one to reuse the same case structure every time.
              </p>
              <Button size="sm" onClick={startNew}>
                <Plus className="mr-1 h-4 w-4" /> New template
              </Button>
            </CardContent>
          </Card>
        ) : (
          templates.map((t) => (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(t)} aria-label="Edit template">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(t.id)} aria-label="Delete template">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {t.title_prefix && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Title starts with: </span>
                    {t.title_prefix}
                  </p>
                )}
                {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{t.status}</Badge>
                  <Badge variant="outline">{t.severity}</Badge>
                  {(t.tags || []).map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                  <span className="text-xs text-muted-foreground">
                    {(t.default_findings?.length || 0)} default finding(s)
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit template" : "New template"}</DialogTitle>
            <DialogDescription>
              These values fill in automatically whenever you start a case from this template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">Template name</Label>
              <Input
                id="tpl-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Fire incident report"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-prefix">Case title prefix</Label>
              <Input
                id="tpl-prefix"
                value={form.title_prefix}
                onChange={(e) => setForm({ ...form, title_prefix: e.target.value })}
                placeholder="e.g. Fire incident —"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-desc">Default description</Label>
              <Textarea
                id="tpl-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Standard notes to start every case with"
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
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-tags">Tags</Label>
              <Input
                id="tpl-tags"
                value={form.tagsText}
                onChange={(e) => setForm({ ...form, tagsText: e.target.value })}
                placeholder="Separate with commas"
              />
            </div>

            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <Label>Default findings</Label>
                <Button type="button" variant="outline" size="sm" onClick={addFinding}>
                  <Plus className="mr-1 h-4 w-4" /> Add
                </Button>
              </div>
              {form.default_findings.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Add checklist items that should be created in every new case.
                </p>
              )}
              {form.default_findings.map((f, i) => (
                <div key={i} className="space-y-2 rounded-md bg-muted/40 p-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={f.title}
                      onChange={(e) => updateFinding(i, { title: e.target.value })}
                      placeholder="Finding title"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFinding(i)}
                      aria-label="Remove finding"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    value={f.detail || ""}
                    onChange={(e) => updateFinding(i, { detail: e.target.value })}
                    placeholder="Details (optional)"
                    rows={2}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={f.category} onValueChange={(v) => updateFinding(i, { category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="observation">Observation</SelectItem>
                        <SelectItem value="witness">Witness</SelectItem>
                        <SelectItem value="injury">Injury</SelectItem>
                        <SelectItem value="damage">Damage</SelectItem>
                        <SelectItem value="action">Action</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={f.importance} onValueChange={(v) => updateFinding(i, { importance: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Save changes" : "Create template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this template?</AlertDialogTitle>
            <AlertDialogDescription>
              Cases you already created stay exactly as they are.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CaseTemplates;

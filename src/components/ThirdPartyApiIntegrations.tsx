import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plug, Plus, Trash2, Play, Loader2 } from "lucide-react";

type AuthType = "none" | "bearer" | "api_key" | "basic";

interface Integration {
  id: string;
  name: string;
  base_url: string;
  auth_type: AuthType;
  auth_header_name: string | null;
  credential: string | null;
  is_active: boolean;
  last_tested_at: string | null;
  last_test_status: string | null;
}

const emptyForm = {
  name: "",
  base_url: "",
  auth_type: "none" as AuthType,
  auth_header_name: "X-API-Key",
  credential: "",
};

export default function ThirdPartyApiIntegrations() {
  const { toast } = useToast();
  const [items, setItems] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("third_party_integrations")
      .select("id,name,base_url,auth_type,auth_header_name,credential,is_active,last_tested_at,last_test_status")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load integrations", description: error.message, variant: "destructive" });
    } else {
      setItems((data || []) as Integration[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.base_url.trim()) {
      toast({ title: "Missing fields", description: "Name and Base URL are required.", variant: "destructive" });
      return;
    }
    try { new URL(form.base_url); } catch {
      toast({ title: "Invalid URL", description: "Base URL must be a valid http(s) URL.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from("third_party_integrations").insert({
      user_id: user.id,
      name: form.name.trim(),
      base_url: form.base_url.trim(),
      auth_type: form.auth_type,
      auth_header_name: form.auth_type === "api_key" ? form.auth_header_name.trim() : null,
      credential: form.auth_type === "none" ? null : form.credential || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Integration added" });
    setForm(emptyForm);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this integration?")) return;
    const { error } = await supabase.from("third_party_integrations").delete().eq("id", id);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted" });
      load();
    }
  };

  const handleToggle = async (id: string, is_active: boolean) => {
    const { error } = await supabase.from("third_party_integrations").update({ is_active }).eq("id", id);
    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    } else {
      load();
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    const { data, error } = await supabase.functions.invoke("third-party-api-call", {
      body: { integration_id: id, method: "GET", path: "" },
    });
    setTestingId(null);
    if (error) {
      toast({ title: "Test failed", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: data?.ok ? `Success (${data.status})` : `Response (${data?.status ?? "—"})`,
        description: (data?.response || "").slice(0, 200) || "No body",
        variant: data?.ok ? "default" : "destructive",
      });
      load();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            <CardTitle>Add Third-Party API</CardTitle>
          </div>
          <CardDescription>
            Register any external API. Credentials are stored privately under your account (RLS-protected) and
            calls are proxied server-side so secrets never leak to the browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="e.g. OpenWeather"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Base URL</Label>
              <Input
                placeholder="https://api.example.com/v1/"
                value={form.base_url}
                onChange={(e) => setForm({ ...form, base_url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Auth Type</Label>
              <Select
                value={form.auth_type}
                onValueChange={(v) => setForm({ ...form, auth_type: v as AuthType })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="bearer">Bearer Token</SelectItem>
                  <SelectItem value="api_key">API Key (header)</SelectItem>
                  <SelectItem value="basic">Basic (base64 user:pass)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.auth_type === "api_key" && (
              <div className="space-y-2">
                <Label>Header Name</Label>
                <Input
                  value={form.auth_header_name}
                  onChange={(e) => setForm({ ...form, auth_header_name: e.target.value })}
                />
              </div>
            )}
            {form.auth_type !== "none" && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Credential</Label>
                <Input
                  type="password"
                  placeholder="Token / API key / base64(user:pass)"
                  value={form.credential}
                  onChange={(e) => setForm({ ...form, credential: e.target.value })}
                />
              </div>
            )}
          </div>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Add Integration
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            <CardTitle>Your Integrations</CardTitle>
          </div>
          <CardDescription>Toggle, test, or remove configured APIs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No integrations yet.</p>
          ) : (
            items.map((it) => (
              <div key={it.id} className="flex flex-wrap items-center gap-3 p-3 rounded-md border">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{it.name}</p>
                    <Badge variant="outline">{it.auth_type}</Badge>
                    {it.last_test_status && (
                      <Badge variant={it.last_test_status.startsWith("ok") ? "secondary" : "destructive"}>
                        {it.last_test_status}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground break-all">{it.base_url}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={it.is_active}
                    onCheckedChange={(checked) => handleToggle(it.id, checked)}
                    aria-label="Toggle active"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTest(it.id)}
                    disabled={testingId === it.id || !it.is_active}
                  >
                    {testingId === it.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(it.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

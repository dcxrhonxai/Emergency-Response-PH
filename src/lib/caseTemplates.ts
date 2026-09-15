import { supabase } from "@/integrations/supabase/client";

export interface TemplateFinding {
  title: string;
  detail?: string;
  category: string;
  importance: string;
}

export interface CaseTemplate {
  id: string;
  user_id: string;
  name: string;
  title_prefix: string | null;
  description: string | null;
  severity: string;
  status: string;
  tags: string[] | null;
  default_findings: TemplateFinding[] | null;
  created_at: string;
  updated_at: string;
}

export const fetchCaseTemplates = async (userId: string): Promise<CaseTemplate[]> => {
  const { data, error } = await supabase
    .from("case_templates")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as CaseTemplate[];
};

/** Creates the default findings defined by a template for a freshly created case. */
export const applyTemplateFindings = async (
  template: CaseTemplate,
  caseId: string,
  userId: string,
  recordedAt: string,
) => {
  const findings = (template.default_findings || []).filter((f) => f.title?.trim());
  if (findings.length === 0) return;
  const { error } = await supabase.from("case_findings").insert(
    findings.map((f) => ({
      case_id: caseId,
      user_id: userId,
      title: f.title.trim(),
      detail: f.detail?.trim() || null,
      category: f.category || "observation",
      importance: f.importance || "normal",
      recorded_at: recordedAt,
    })),
  );
  if (error) throw error;
};

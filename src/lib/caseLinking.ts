import { supabase } from "@/integrations/supabase/client";

export interface AlertForCase {
  id: string;
  emergency_type: string;
  situation: string;
  status?: string | null;
  created_at: string;
  latitude?: number | null;
  longitude?: number | null;
  evidence_files?: any;
}

const TYPE_LABELS: Record<string, string> = {
  fire: "Fire Emergency",
  medical: "Medical Emergency",
  police: "Police / Crime",
  accident: "Road Accident",
  disaster: "Natural Disaster",
  other: "Other Emergency",
};

export const alertTypeLabel = (type: string) =>
  TYPE_LABELS[type] || type.replace("_", " ");

/**
 * Finds (or creates) the case for an alert, records the alert as a finding
 * in that case, and returns the case id so the caller can navigate to it.
 */
export const addAlertToCaseAsFinding = async (
  alert: AlertForCase,
  userId: string
): Promise<{ caseId: string; created: boolean; findingAdded: boolean }> => {
  // 1. Existing case for this alert?
  const { data: link, error: linkError } = await supabase
    .from("case_alerts")
    .select("case_id")
    .eq("alert_id", alert.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (linkError) throw linkError;

  let caseId = link?.case_id as string | undefined;
  let created = false;

  // 2. Otherwise create a case for it and link the alert.
  if (!caseId) {
    const label = alertTypeLabel(alert.emergency_type);
    const when = new Date(alert.created_at).toLocaleDateString();
    const { data: newCase, error: caseError } = await supabase
      .from("cases")
      .insert({
        user_id: userId,
        title: `${label} — ${when}`,
        description: alert.situation,
        status: alert.status === "resolved" ? "investigating" : "open",
        severity: alert.emergency_type === "other" ? "medium" : "high",
        incident_date: alert.created_at,
      })
      .select("id")
      .single();
    if (caseError || !newCase) throw caseError ?? new Error("Case not created");
    caseId = newCase.id;
    created = true;

    const { error: insertLinkError } = await supabase
      .from("case_alerts")
      .insert({ case_id: caseId, alert_id: alert.id, user_id: userId });
    if (insertLinkError) throw insertLinkError;
  }

  // 3. Record the alert as a finding (once per alert per case).
  const findingTitle = `Alert: ${alertTypeLabel(alert.emergency_type)}`;
  const { data: existing } = await supabase
    .from("case_findings")
    .select("id, evidence_ref")
    .eq("case_id", caseId)
    .eq("title", findingTitle);

  const already = (existing || []).some(
    (f: any) => f.evidence_ref && f.evidence_ref.alert_id === alert.id
  );

  let findingAdded = false;
  if (!already) {
    const evidence = Array.isArray(alert.evidence_files) ? alert.evidence_files : [];
    const parts = [alert.situation];
    if (alert.latitude != null && alert.longitude != null) {
      parts.push(`Location: ${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}`);
    }
    if (evidence.length) parts.push(`${evidence.length} evidence file(s) attached`);

    const { error: findingError } = await supabase.from("case_findings").insert({
      case_id: caseId,
      user_id: userId,
      title: findingTitle,
      detail: parts.join(" · "),
      category: "observation",
      importance: alert.status === "active" ? "high" : "normal",
      recorded_at: alert.created_at,
      evidence_ref: { alert_id: alert.id, evidence_files: evidence },
    });
    if (findingError) throw findingError;
    findingAdded = true;
  }

  return { caseId, created, findingAdded };
};

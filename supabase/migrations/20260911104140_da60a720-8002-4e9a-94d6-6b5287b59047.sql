CREATE TABLE public.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  severity text NOT NULL DEFAULT 'medium',
  incident_date timestamptz,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cases TO authenticated;
GRANT ALL ON public.cases TO service_role;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cases" ON public.cases FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.case_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  alert_id uuid NOT NULL REFERENCES public.emergency_alerts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, alert_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_alerts TO authenticated;
GRANT ALL ON public.case_alerts TO service_role;
ALTER TABLE public.case_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own case alerts" ON public.case_alerts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.case_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  detail text,
  category text NOT NULL DEFAULT 'observation',
  importance text NOT NULL DEFAULT 'normal',
  recorded_at timestamptz NOT NULL DEFAULT now(),
  evidence_ref jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_findings TO authenticated;
GRANT ALL ON public.case_findings TO service_role;
ALTER TABLE public.case_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own case findings" ON public.case_findings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_case_findings_updated_at BEFORE UPDATE ON public.case_findings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_cases_user ON public.cases(user_id, created_at DESC);
CREATE INDEX idx_case_alerts_case ON public.case_alerts(case_id);
CREATE INDEX idx_case_findings_case ON public.case_findings(case_id, recorded_at DESC);
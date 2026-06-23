CREATE TABLE public.evidence_retention_settings (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  retention_days INTEGER,
  last_cleanup_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT evidence_retention_days_positive CHECK (retention_days IS NULL OR retention_days > 0)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_retention_settings TO authenticated;
GRANT ALL ON public.evidence_retention_settings TO service_role;

ALTER TABLE public.evidence_retention_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own evidence retention"
  ON public.evidence_retention_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER evidence_retention_settings_updated_at
  BEFORE UPDATE ON public.evidence_retention_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
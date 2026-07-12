CREATE TABLE public.evidence_cleanup_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retention_days INTEGER,
  deleted_count INTEGER NOT NULL DEFAULT 0,
  buckets JSONB,
  cutoff TIMESTAMPTZ,
  skipped BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.evidence_cleanup_history TO authenticated;
GRANT ALL ON public.evidence_cleanup_history TO service_role;

ALTER TABLE public.evidence_cleanup_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cleanup history"
  ON public.evidence_cleanup_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_evidence_cleanup_history_user_ran
  ON public.evidence_cleanup_history (user_id, ran_at DESC);
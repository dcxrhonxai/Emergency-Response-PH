ALTER TABLE public.evidence_retention_settings
  ADD COLUMN IF NOT EXISTS notify_on_cleanup boolean NOT NULL DEFAULT true;
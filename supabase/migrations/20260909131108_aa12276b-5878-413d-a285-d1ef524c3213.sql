ALTER TABLE public.evidence_retention_settings
  ADD COLUMN IF NOT EXISTS photo_retention_days integer,
  ADD COLUMN IF NOT EXISTS video_retention_days integer,
  ADD COLUMN IF NOT EXISTS audio_retention_days integer;

ALTER TABLE public.evidence_cleanup_history
  ADD COLUMN IF NOT EXISTS retention_by_type jsonb;
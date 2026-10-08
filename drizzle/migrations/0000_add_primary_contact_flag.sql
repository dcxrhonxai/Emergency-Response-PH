ALTER TABLE public.personal_contacts ADD COLUMN is_primary boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.personal_contacts.is_primary IS 'Marks the primary trusted contact shown in the Emergency screen shortcut';

-- Backfill: for each user with contacts, mark their most recent one as primary
UPDATE public.personal_contacts pc
SET is_primary = true
WHERE pc.created_at = (
  SELECT MAX(pc2.created_at) FROM public.personal_contacts pc2 WHERE pc2.user_id = pc.user_id
);
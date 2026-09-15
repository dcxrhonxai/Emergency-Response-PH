CREATE TABLE public.case_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  title_prefix text,
  description text,
  severity text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  tags text[] NOT NULL DEFAULT '{}',
  default_findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_templates TO authenticated;
GRANT ALL ON public.case_templates TO service_role;

ALTER TABLE public.case_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own case templates"
ON public.case_templates FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_case_templates_user ON public.case_templates(user_id, created_at DESC);

CREATE TRIGGER update_case_templates_updated_at
BEFORE UPDATE ON public.case_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Create service_ratings table for rating emergency services
CREATE TABLE public.service_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.emergency_services(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (service_id, user_id)
);

-- Enable RLS
ALTER TABLE public.service_ratings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view ratings"
ON public.service_ratings
FOR SELECT
USING (true);

CREATE POLICY "Users can insert own ratings"
ON public.service_ratings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings"
ON public.service_ratings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ratings"
ON public.service_ratings
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_service_ratings_updated_at
BEFORE UPDATE ON public.service_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
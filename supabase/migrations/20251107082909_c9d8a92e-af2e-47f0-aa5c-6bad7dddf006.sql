-- Add DELETE policies for emergency_alerts table
CREATE POLICY "Users can delete own alerts"
ON public.emergency_alerts
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete all alerts"
ON public.emergency_alerts
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create pending_emergency_services table for moderation system
CREATE TABLE public.pending_emergency_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  city TEXT,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on pending_emergency_services
ALTER TABLE public.pending_emergency_services ENABLE ROW LEVEL SECURITY;

-- Users can insert their own pending services
CREATE POLICY "Users can submit pending services"
ON public.pending_emergency_services
FOR INSERT
WITH CHECK (auth.uid() = submitted_by AND status = 'pending');

-- Users can view their own pending services
CREATE POLICY "Users can view own pending services"
ON public.pending_emergency_services
FOR SELECT
USING (auth.uid() = submitted_by);

-- Admins can view all pending services
CREATE POLICY "Admins can view all pending services"
ON public.pending_emergency_services
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update pending services (for approval/rejection)
CREATE POLICY "Admins can update pending services"
ON public.pending_emergency_services
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete pending services
CREATE POLICY "Admins can delete pending services"
ON public.pending_emergency_services
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add indexes for better performance
CREATE INDEX idx_pending_services_status ON public.pending_emergency_services(status);
CREATE INDEX idx_pending_services_submitted_by ON public.pending_emergency_services(submitted_by);

-- Remove the overly permissive insert policy from emergency_services
DROP POLICY IF EXISTS "Users can suggest emergency services" ON public.emergency_services;
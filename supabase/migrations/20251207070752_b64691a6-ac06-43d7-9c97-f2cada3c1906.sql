-- Create medications table for tracking medication schedules
CREATE TABLE public.medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  time_of_day TEXT[] DEFAULT '{}',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create doctor_contacts table
CREATE TABLE public.doctor_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  specialty TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  hospital TEXT,
  address TEXT,
  notes TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create medical_history table for tracking medical events
CREATE TABLE public.medical_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  doctor_id UUID REFERENCES public.doctor_contacts(id) ON DELETE SET NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create video_streams table for live streaming during emergencies
CREATE TABLE public.video_streams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL,
  user_id UUID NOT NULL,
  stream_url TEXT,
  status TEXT DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_streams ENABLE ROW LEVEL SECURITY;

-- RLS policies for medications
CREATE POLICY "Users can view own medications" ON public.medications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own medications" ON public.medications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own medications" ON public.medications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own medications" ON public.medications FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for doctor_contacts
CREATE POLICY "Users can view own doctors" ON public.doctor_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own doctors" ON public.doctor_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own doctors" ON public.doctor_contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own doctors" ON public.doctor_contacts FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for medical_history
CREATE POLICY "Users can view own history" ON public.medical_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own history" ON public.medical_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own history" ON public.medical_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own history" ON public.medical_history FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for video_streams
CREATE POLICY "Users can view own streams" ON public.video_streams FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own streams" ON public.video_streams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own streams" ON public.video_streams FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all streams" ON public.video_streams FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for video_streams
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_streams;

-- Create indexes
CREATE INDEX idx_medications_user_id ON public.medications(user_id);
CREATE INDEX idx_doctor_contacts_user_id ON public.doctor_contacts(user_id);
CREATE INDEX idx_medical_history_user_id ON public.medical_history(user_id);
CREATE INDEX idx_video_streams_alert_id ON public.video_streams(alert_id);

-- Update trigger for medications
CREATE TRIGGER update_medications_updated_at
  BEFORE UPDATE ON public.medications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
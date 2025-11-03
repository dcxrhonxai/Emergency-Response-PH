-- Create emergency_messages table for in-app chat
CREATE TABLE IF NOT EXISTS public.emergency_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL REFERENCES public.emergency_alerts(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.emergency_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for emergency messages
CREATE POLICY "Users can view messages for their alerts"
  ON public.emergency_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.emergency_alerts
      WHERE emergency_alerts.id = emergency_messages.alert_id
      AND emergency_alerts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages for their alerts"
  ON public.emergency_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.emergency_alerts
      WHERE emergency_alerts.id = emergency_messages.alert_id
      AND emergency_alerts.user_id = auth.uid()
    )
  );

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_messages;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_emergency_messages_alert_id ON public.emergency_messages(alert_id);
CREATE INDEX IF NOT EXISTS idx_emergency_messages_created_at ON public.emergency_messages(created_at);
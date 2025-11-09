-- Create in_app_notifications table
CREATE TABLE public.in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for in_app_notifications
CREATE POLICY "Users can view own notifications"
ON public.in_app_notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.in_app_notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
ON public.in_app_notifications
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.in_app_notifications
FOR INSERT
WITH CHECK (true);

-- Add FCM token to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Enable realtime for in_app_notifications
ALTER TABLE public.in_app_notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.in_app_notifications;

-- Add group chat support to emergency_messages
ALTER TABLE public.emergency_messages
ADD COLUMN IF NOT EXISTS is_group_message BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.in_app_notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.in_app_notifications(created_at DESC);
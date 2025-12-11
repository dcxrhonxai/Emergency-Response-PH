-- Create contact_groups table
CREATE TABLE public.contact_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  emergency_types TEXT[] DEFAULT '{}',
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create contact_group_members junction table
CREATE TABLE public.contact_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.contact_groups(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.personal_contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(group_id, contact_id)
);

-- Enable RLS on both tables
ALTER TABLE public.contact_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_group_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for contact_groups
CREATE POLICY "Users can view own groups" ON public.contact_groups
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own groups" ON public.contact_groups
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own groups" ON public.contact_groups
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own groups" ON public.contact_groups
FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for contact_group_members (check ownership via group)
CREATE POLICY "Users can view members of own groups" ON public.contact_group_members
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.contact_groups
    WHERE contact_groups.id = contact_group_members.group_id
    AND contact_groups.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add members to own groups" ON public.contact_group_members
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contact_groups
    WHERE contact_groups.id = contact_group_members.group_id
    AND contact_groups.user_id = auth.uid()
  )
);

CREATE POLICY "Users can remove members from own groups" ON public.contact_group_members
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.contact_groups
    WHERE contact_groups.id = contact_group_members.group_id
    AND contact_groups.user_id = auth.uid()
  )
);

-- Add trigger for updated_at on contact_groups
CREATE TRIGGER update_contact_groups_updated_at
BEFORE UPDATE ON public.contact_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
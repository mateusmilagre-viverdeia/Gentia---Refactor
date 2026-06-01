-- Create consultant_time_entries table for time tracking
CREATE TABLE public.consultant_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID NOT NULL REFERENCES public.ep_consultants(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Entry data
  entry_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  
  -- Categorization
  category TEXT NOT NULL CHECK (category IN ('checkpoint', 'preparation', 'follow_up', 'documentation', 'training', 'other')),
  description TEXT,
  
  -- Optional checkpoint association
  checkpoint_id UUID REFERENCES public.project_checkpoints(id) ON DELETE SET NULL,
  
  -- Metadata
  billable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX idx_time_entries_consultant ON public.consultant_time_entries(consultant_id);
CREATE INDEX idx_time_entries_account ON public.consultant_time_entries(account_id);
CREATE INDEX idx_time_entries_date ON public.consultant_time_entries(entry_date);
CREATE INDEX idx_time_entries_category ON public.consultant_time_entries(category);

-- Enable RLS
ALTER TABLE public.consultant_time_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Consultants can manage their own entries
CREATE POLICY "Consultants manage own time entries"
  ON public.consultant_time_entries
  FOR ALL
  TO authenticated
  USING (
    consultant_id IN (
      SELECT id FROM public.ep_consultants WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    consultant_id IN (
      SELECT id FROM public.ep_consultants WHERE user_id = auth.uid()
    )
  );

-- Policy: Head CS and Super Admin can view all entries
CREATE POLICY "Managers view all time entries"
  ON public.consultant_time_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'head_cs')
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON public.consultant_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create hiring_funnels table
CREATE TABLE public.hiring_funnels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create hiring_funnel_stages table
CREATE TABLE public.hiring_funnel_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id UUID NOT NULL REFERENCES public.hiring_funnels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER NOT NULL,
  icon TEXT,
  color TEXT,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_hiring_funnels_account_id ON public.hiring_funnels(account_id);
CREATE INDEX idx_hiring_funnel_stages_funnel_id ON public.hiring_funnel_stages(funnel_id);
CREATE INDEX idx_hiring_funnel_stages_position ON public.hiring_funnel_stages(funnel_id, position);

-- Enable RLS
ALTER TABLE public.hiring_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hiring_funnel_stages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hiring_funnels
CREATE POLICY "Members can view account funnels"
ON public.hiring_funnels FOR SELECT
USING (is_account_member(auth.uid(), account_id));

CREATE POLICY "Members can create account funnels"
ON public.hiring_funnels FOR INSERT
WITH CHECK (is_account_member(auth.uid(), account_id));

CREATE POLICY "Members can update account funnels"
ON public.hiring_funnels FOR UPDATE
USING (is_account_member(auth.uid(), account_id));

CREATE POLICY "Members can delete account funnels"
ON public.hiring_funnels FOR DELETE
USING (is_account_member(auth.uid(), account_id));

-- RLS Policies for hiring_funnel_stages
CREATE POLICY "Members can view funnel stages"
ON public.hiring_funnel_stages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.hiring_funnels hf
  WHERE hf.id = hiring_funnel_stages.funnel_id
  AND is_account_member(auth.uid(), hf.account_id)
));

CREATE POLICY "Members can create funnel stages"
ON public.hiring_funnel_stages FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.hiring_funnels hf
  WHERE hf.id = hiring_funnel_stages.funnel_id
  AND is_account_member(auth.uid(), hf.account_id)
));

CREATE POLICY "Members can update funnel stages"
ON public.hiring_funnel_stages FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.hiring_funnels hf
  WHERE hf.id = hiring_funnel_stages.funnel_id
  AND is_account_member(auth.uid(), hf.account_id)
));

CREATE POLICY "Members can delete funnel stages"
ON public.hiring_funnel_stages FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.hiring_funnels hf
  WHERE hf.id = hiring_funnel_stages.funnel_id
  AND is_account_member(auth.uid(), hf.account_id)
));

-- Trigger for updated_at
CREATE TRIGGER update_hiring_funnels_updated_at
BEFORE UPDATE ON public.hiring_funnels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

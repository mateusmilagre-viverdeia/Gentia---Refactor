-- Create roip_simulations table to store calculator simulations
CREATE TABLE public.roip_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID REFERENCES public.companies(id),
  nome_empresa TEXT NOT NULL,
  dados_simulacao JSONB NOT NULL,
  resultados_calculadora JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.roip_simulations ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own simulations" 
ON public.roip_simulations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own simulations" 
ON public.roip_simulations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own simulations" 
ON public.roip_simulations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add roip_simulation_id column to roip_assessments
ALTER TABLE public.roip_assessments 
ADD COLUMN roip_simulation_id UUID REFERENCES public.roip_simulations(id);

-- Create index for faster lookup
CREATE INDEX idx_roip_simulations_user_id ON public.roip_simulations(user_id);
CREATE INDEX idx_roip_simulations_account_id ON public.roip_simulations(account_id);
CREATE INDEX idx_roip_assessments_simulation_id ON public.roip_assessments(roip_simulation_id);
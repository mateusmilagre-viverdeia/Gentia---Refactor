-- Create table for metric thresholds configuration
CREATE TABLE public.recruitment_metric_thresholds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Alert toggles
  alert_time_to_hire BOOLEAN DEFAULT true,
  alert_conversion_rate BOOLEAN DEFAULT true,
  alert_rejection_rate BOOLEAN DEFAULT true,
  alert_stagnant_pipeline BOOLEAN DEFAULT true,
  
  -- Threshold values
  max_time_to_hire_days INTEGER DEFAULT 30,
  min_conversion_rate DECIMAL(5,2) DEFAULT 3.00,
  max_rejection_rate DECIMAL(5,2) DEFAULT 80.00,
  max_stagnant_days INTEGER DEFAULT 14,
  
  -- Email configuration
  email_enabled BOOLEAN DEFAULT true,
  email_frequency TEXT DEFAULT 'daily' CHECK (email_frequency IN ('instant', 'daily', 'weekly')),
  notify_emails TEXT[] DEFAULT '{}',
  
  -- Last check timestamp
  last_check_at TIMESTAMP WITH TIME ZONE,
  last_alert_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(account_id)
);

-- Create table to store alert history
CREATE TABLE public.recruitment_metric_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Alert details
  alert_type TEXT NOT NULL CHECK (alert_type IN ('time_to_hire', 'conversion_rate', 'rejection_rate', 'stagnant_pipeline')),
  metric_value DECIMAL(10,2) NOT NULL,
  threshold_value DECIMAL(10,2) NOT NULL,
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  
  -- Status
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Email tracking
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  emails_sent_to TEXT[] DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.recruitment_metric_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_metric_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for thresholds
CREATE POLICY "Users can view their org thresholds" 
ON public.recruitment_metric_thresholds 
FOR SELECT 
USING (
  account_id IN (
    SELECT account_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert their org thresholds" 
ON public.recruitment_metric_thresholds 
FOR INSERT 
WITH CHECK (
  account_id IN (
    SELECT account_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update their org thresholds" 
ON public.recruitment_metric_thresholds 
FOR UPDATE 
USING (
  account_id IN (
    SELECT account_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- RLS policies for alerts
CREATE POLICY "Users can view their org alerts" 
ON public.recruitment_metric_alerts 
FOR SELECT 
USING (
  account_id IN (
    SELECT account_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert their org alerts" 
ON public.recruitment_metric_alerts 
FOR INSERT 
WITH CHECK (
  account_id IN (
    SELECT account_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update their org alerts" 
ON public.recruitment_metric_alerts 
FOR UPDATE 
USING (
  account_id IN (
    SELECT account_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_recruitment_metric_thresholds_updated_at
BEFORE UPDATE ON public.recruitment_metric_thresholds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
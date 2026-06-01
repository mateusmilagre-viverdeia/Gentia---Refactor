CREATE TABLE public.account_health_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL UNIQUE,
  usage_score INTEGER NOT NULL DEFAULT 50 CHECK (usage_score >= 0 AND usage_score <= 100),
  adoption_score INTEGER NOT NULL DEFAULT 50 CHECK (adoption_score >= 0 AND adoption_score <= 100),
  engagement_score INTEGER NOT NULL DEFAULT 50 CHECK (engagement_score >= 0 AND engagement_score <= 100),
  ai_consumption_score INTEGER NOT NULL DEFAULT 50 CHECK (ai_consumption_score >= 0 AND ai_consumption_score <= 100),
  billing_score INTEGER NOT NULL DEFAULT 50 CHECK (billing_score >= 0 AND billing_score <= 100),
  nps_score INTEGER NOT NULL DEFAULT 50 CHECK (nps_score >= 0 AND nps_score <= 100),
  overall_score INTEGER NOT NULL DEFAULT 50 CHECK (overall_score >= 0 AND overall_score <= 100),
  health_status TEXT NOT NULL DEFAULT 'yellow' CHECK (health_status IN ('green','yellow','red')),
  indicators_detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_health_scores_account_id ON public.account_health_scores(account_id);
CREATE INDEX idx_account_health_scores_status ON public.account_health_scores(health_status);
CREATE INDEX idx_account_health_scores_overall ON public.account_health_scores(overall_score);

ALTER TABLE public.account_health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all account health scores"
ON public.account_health_scores
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert account health scores"
ON public.account_health_scores
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update account health scores"
ON public.account_health_scores
FOR UPDATE
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete account health scores"
ON public.account_health_scores
FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER update_account_health_scores_updated_at
BEFORE UPDATE ON public.account_health_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
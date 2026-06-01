-- Create table for organization API keys
CREATE TABLE public.organization_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create table for organization webhooks
CREATE TABLE public.organization_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organization_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_webhooks ENABLE ROW LEVEL SECURITY;

-- RLS for API keys - members of the organization can view/manage
CREATE POLICY "Organization members can view API keys"
ON public.organization_api_keys FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.account_members
    WHERE account_members.account_id = organization_api_keys.account_id
    AND account_members.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.companies
    WHERE companies.id = organization_api_keys.account_id
    AND companies.user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can insert API keys"
ON public.organization_api_keys FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.account_members
    WHERE account_members.account_id = organization_api_keys.account_id
    AND account_members.user_id = auth.uid()
    AND account_members.role IN ('owner', 'admin')
  )
  OR
  EXISTS (
    SELECT 1 FROM public.companies
    WHERE companies.id = organization_api_keys.account_id
    AND companies.user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can delete API keys"
ON public.organization_api_keys FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.account_members
    WHERE account_members.account_id = organization_api_keys.account_id
    AND account_members.user_id = auth.uid()
    AND account_members.role IN ('owner', 'admin')
  )
  OR
  EXISTS (
    SELECT 1 FROM public.companies
    WHERE companies.id = organization_api_keys.account_id
    AND companies.user_id = auth.uid()
  )
);

-- RLS for Webhooks - members of the organization can view/manage
CREATE POLICY "Organization members can view webhooks"
ON public.organization_webhooks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.account_members
    WHERE account_members.account_id = organization_webhooks.account_id
    AND account_members.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.companies
    WHERE companies.id = organization_webhooks.account_id
    AND companies.user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can insert webhooks"
ON public.organization_webhooks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.account_members
    WHERE account_members.account_id = organization_webhooks.account_id
    AND account_members.user_id = auth.uid()
    AND account_members.role IN ('owner', 'admin')
  )
  OR
  EXISTS (
    SELECT 1 FROM public.companies
    WHERE companies.id = organization_webhooks.account_id
    AND companies.user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can update webhooks"
ON public.organization_webhooks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.account_members
    WHERE account_members.account_id = organization_webhooks.account_id
    AND account_members.user_id = auth.uid()
    AND account_members.role IN ('owner', 'admin')
  )
  OR
  EXISTS (
    SELECT 1 FROM public.companies
    WHERE companies.id = organization_webhooks.account_id
    AND companies.user_id = auth.uid()
  )
);

CREATE POLICY "Organization admins can delete webhooks"
ON public.organization_webhooks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.account_members
    WHERE account_members.account_id = organization_webhooks.account_id
    AND account_members.user_id = auth.uid()
    AND account_members.role IN ('owner', 'admin')
  )
  OR
  EXISTS (
    SELECT 1 FROM public.companies
    WHERE companies.id = organization_webhooks.account_id
    AND companies.user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_organization_api_keys_account_id ON public.organization_api_keys(account_id);
CREATE INDEX idx_organization_webhooks_account_id ON public.organization_webhooks(account_id);

-- Create trigger for updated_at on webhooks
CREATE TRIGGER update_organization_webhooks_updated_at
BEFORE UPDATE ON public.organization_webhooks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
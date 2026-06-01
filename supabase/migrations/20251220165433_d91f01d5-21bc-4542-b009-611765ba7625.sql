-- Fix RLS policies for energy_selections and development_selections
-- These tables need to allow account members and consultants to manage selections

-- Drop old policies
DROP POLICY IF EXISTS "Users can manage own selections" ON public.energy_selections;
DROP POLICY IF EXISTS "Users can manage own selections" ON public.development_selections;

-- Create new policy for energy_selections
CREATE POLICY "Members can manage account selections" 
ON public.energy_selections 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM energy_sessions es
    WHERE es.id = energy_selections.session_id
    AND (
      es.user_id = auth.uid()
      OR is_account_member(auth.uid(), es.account_id)
      OR can_edit_client_project(auth.uid(), es.account_id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM energy_sessions es
    WHERE es.id = session_id
    AND (
      es.user_id = auth.uid()
      OR is_account_member(auth.uid(), es.account_id)
      OR can_edit_client_project(auth.uid(), es.account_id)
    )
  )
);

-- Create new policy for development_selections
CREATE POLICY "Members can manage account selections" 
ON public.development_selections 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM development_sessions ds
    WHERE ds.id = development_selections.session_id
    AND (
      ds.user_id = auth.uid()
      OR is_account_member(auth.uid(), ds.account_id)
      OR can_edit_client_project(auth.uid(), ds.account_id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM development_sessions ds
    WHERE ds.id = session_id
    AND (
      ds.user_id = auth.uid()
      OR is_account_member(auth.uid(), ds.account_id)
      OR can_edit_client_project(auth.uid(), ds.account_id)
    )
  )
);
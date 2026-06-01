CREATE POLICY "Super admins can insert ai_prompts"
ON public.ai_prompts
FOR INSERT
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete ai_prompts"
ON public.ai_prompts
FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));
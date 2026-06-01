-- Drop overly permissive policies
DROP POLICY IF EXISTS "Users can insert competency assessments" ON public.onboarding_competency_assessments;
DROP POLICY IF EXISTS "Users can update competency assessments" ON public.onboarding_competency_assessments;
DROP POLICY IF EXISTS "Users can delete competency assessments" ON public.onboarding_competency_assessments;

-- Create proper access-controlled policies for INSERT
CREATE POLICY "Involved users can insert assessments"
ON public.onboarding_competency_assessments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM onboarding_processes op
    WHERE op.id = process_id
    AND (
      auth.uid() = op.created_by
      OR auth.uid() = op.leader_id
      OR auth.uid() = op.hr_responsible_id
      OR is_super_admin(auth.uid())
    )
  )
);

-- Create proper access-controlled policies for UPDATE
CREATE POLICY "Involved users can update assessments"
ON public.onboarding_competency_assessments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM onboarding_processes op
    WHERE op.id = process_id
    AND (
      auth.uid() = op.created_by
      OR auth.uid() = op.leader_id
      OR auth.uid() = op.hr_responsible_id
      OR is_super_admin(auth.uid())
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM onboarding_processes op
    WHERE op.id = process_id
    AND (
      auth.uid() = op.created_by
      OR auth.uid() = op.leader_id
      OR auth.uid() = op.hr_responsible_id
      OR is_super_admin(auth.uid())
    )
  )
);

-- Create proper access-controlled policies for DELETE
CREATE POLICY "Involved users can delete assessments"
ON public.onboarding_competency_assessments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM onboarding_processes op
    WHERE op.id = process_id
    AND (
      auth.uid() = op.created_by
      OR auth.uid() = op.leader_id
      OR auth.uid() = op.hr_responsible_id
      OR is_super_admin(auth.uid())
    )
  )
);
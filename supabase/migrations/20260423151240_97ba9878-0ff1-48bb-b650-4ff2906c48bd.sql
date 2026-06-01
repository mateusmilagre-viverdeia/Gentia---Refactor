DROP POLICY IF EXISTS "Users can view their own simulations" ON public.roip_simulations;
DROP POLICY IF EXISTS "Users can create their own simulations" ON public.roip_simulations;
DROP POLICY IF EXISTS "Users can delete their own simulations" ON public.roip_simulations;
DROP POLICY IF EXISTS "Members can view roip simulations" ON public.roip_simulations;
DROP POLICY IF EXISTS "Members can create roip simulations" ON public.roip_simulations;
DROP POLICY IF EXISTS "Members can update roip simulations" ON public.roip_simulations;
DROP POLICY IF EXISTS "Members can delete roip simulations" ON public.roip_simulations;

CREATE POLICY "Members can view roip simulations"
ON public.roip_simulations
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_account_member(auth.uid(), account_id)
  OR public.can_edit_client_project(auth.uid(), account_id)
);

CREATE POLICY "Members can create roip simulations"
ON public.roip_simulations
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (
    account_id IS NULL
    OR public.is_account_member(auth.uid(), account_id)
    OR public.can_edit_client_project(auth.uid(), account_id)
  )
);

CREATE POLICY "Members can update roip simulations"
ON public.roip_simulations
FOR UPDATE
USING (
  auth.uid() = user_id
  OR public.is_account_member(auth.uid(), account_id)
  OR public.can_edit_client_project(auth.uid(), account_id)
)
WITH CHECK (
  auth.uid() = user_id
  OR public.is_account_member(auth.uid(), account_id)
  OR public.can_edit_client_project(auth.uid(), account_id)
);

CREATE POLICY "Members can delete roip simulations"
ON public.roip_simulations
FOR DELETE
USING (
  auth.uid() = user_id
  OR public.is_account_member(auth.uid(), account_id)
  OR public.can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "Users can view own roip answers" ON public.roip_answers;
DROP POLICY IF EXISTS "Users can insert own roip answers" ON public.roip_answers;
DROP POLICY IF EXISTS "Users can update own roip answers" ON public.roip_answers;
DROP POLICY IF EXISTS "Users can delete own roip answers" ON public.roip_answers;
DROP POLICY IF EXISTS "Members can view roip answers" ON public.roip_answers;
DROP POLICY IF EXISTS "Members can create roip answers" ON public.roip_answers;
DROP POLICY IF EXISTS "Members can update roip answers" ON public.roip_answers;
DROP POLICY IF EXISTS "Members can delete roip answers" ON public.roip_answers;

CREATE POLICY "Members can view roip answers"
ON public.roip_answers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.roip_assessments a
    WHERE a.id = roip_answers.roip_assessment_id
      AND (
        a.user_id = auth.uid()
        OR public.is_account_member(auth.uid(), a.account_id)
        OR public.can_edit_client_project(auth.uid(), a.account_id)
      )
  )
);

CREATE POLICY "Members can create roip answers"
ON public.roip_answers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.roip_assessments a
    WHERE a.id = roip_answers.roip_assessment_id
      AND (
        a.user_id = auth.uid()
        OR public.is_account_member(auth.uid(), a.account_id)
        OR public.can_edit_client_project(auth.uid(), a.account_id)
      )
  )
);

CREATE POLICY "Members can update roip answers"
ON public.roip_answers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.roip_assessments a
    WHERE a.id = roip_answers.roip_assessment_id
      AND (
        a.user_id = auth.uid()
        OR public.is_account_member(auth.uid(), a.account_id)
        OR public.can_edit_client_project(auth.uid(), a.account_id)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.roip_assessments a
    WHERE a.id = roip_answers.roip_assessment_id
      AND (
        a.user_id = auth.uid()
        OR public.is_account_member(auth.uid(), a.account_id)
        OR public.can_edit_client_project(auth.uid(), a.account_id)
      )
  )
);

CREATE POLICY "Members can delete roip answers"
ON public.roip_answers
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.roip_assessments a
    WHERE a.id = roip_answers.roip_assessment_id
      AND (
        a.user_id = auth.uid()
        OR public.is_account_member(auth.uid(), a.account_id)
        OR public.can_edit_client_project(auth.uid(), a.account_id)
      )
  )
);

DROP POLICY IF EXISTS "Users can view own roip results" ON public.roip_results;
DROP POLICY IF EXISTS "Users can insert own roip results" ON public.roip_results;
DROP POLICY IF EXISTS "Users can update own roip results" ON public.roip_results;
DROP POLICY IF EXISTS "Users can delete own roip results" ON public.roip_results;
DROP POLICY IF EXISTS "Members can view roip results" ON public.roip_results;
DROP POLICY IF EXISTS "Members can create roip results" ON public.roip_results;
DROP POLICY IF EXISTS "Members can update roip results" ON public.roip_results;
DROP POLICY IF EXISTS "Members can delete roip results" ON public.roip_results;

CREATE POLICY "Members can view roip results"
ON public.roip_results
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.roip_assessments a
    WHERE a.id = roip_results.roip_assessment_id
      AND (
        a.user_id = auth.uid()
        OR public.is_account_member(auth.uid(), a.account_id)
        OR public.can_edit_client_project(auth.uid(), a.account_id)
      )
  )
);

CREATE POLICY "Members can create roip results"
ON public.roip_results
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.roip_assessments a
    WHERE a.id = roip_results.roip_assessment_id
      AND (
        a.user_id = auth.uid()
        OR public.is_account_member(auth.uid(), a.account_id)
        OR public.can_edit_client_project(auth.uid(), a.account_id)
      )
  )
);

CREATE POLICY "Members can update roip results"
ON public.roip_results
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.roip_assessments a
    WHERE a.id = roip_results.roip_assessment_id
      AND (
        a.user_id = auth.uid()
        OR public.is_account_member(auth.uid(), a.account_id)
        OR public.can_edit_client_project(auth.uid(), a.account_id)
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.roip_assessments a
    WHERE a.id = roip_results.roip_assessment_id
      AND (
        a.user_id = auth.uid()
        OR public.is_account_member(auth.uid(), a.account_id)
        OR public.can_edit_client_project(auth.uid(), a.account_id)
      )
  )
);

CREATE POLICY "Members can delete roip results"
ON public.roip_results
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.roip_assessments a
    WHERE a.id = roip_results.roip_assessment_id
      AND (
        a.user_id = auth.uid()
        OR public.is_account_member(auth.uid(), a.account_id)
        OR public.can_edit_client_project(auth.uid(), a.account_id)
      )
  )
);
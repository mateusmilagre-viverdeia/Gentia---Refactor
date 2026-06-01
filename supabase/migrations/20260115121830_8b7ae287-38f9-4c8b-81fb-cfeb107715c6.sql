-- Fix RLS policies for values-related tables to support consulting mode and account members

-- 1. values_selections
DROP POLICY IF EXISTS "Users can manage own selections" ON values_selections;

CREATE POLICY "Members can manage selections"
ON values_selections
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM values_sessions vs
    WHERE vs.id = values_selections.session_id
    AND (
      is_account_member(auth.uid(), vs.account_id)
      OR vs.user_id = auth.uid()
      OR can_edit_client_project(auth.uid(), vs.account_id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM values_sessions vs
    WHERE vs.id = values_selections.session_id
    AND (
      is_account_member(auth.uid(), vs.account_id)
      OR vs.user_id = auth.uid()
      OR can_edit_client_project(auth.uid(), vs.account_id)
    )
  )
);

-- 2. values_behaviors_options
DROP POLICY IF EXISTS "Users can manage own behavior options" ON values_behaviors_options;

CREATE POLICY "Members can manage behavior options"
ON values_behaviors_options
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM values_sessions vs
    WHERE vs.id = values_behaviors_options.session_id
    AND (
      is_account_member(auth.uid(), vs.account_id)
      OR vs.user_id = auth.uid()
      OR can_edit_client_project(auth.uid(), vs.account_id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM values_sessions vs
    WHERE vs.id = values_behaviors_options.session_id
    AND (
      is_account_member(auth.uid(), vs.account_id)
      OR vs.user_id = auth.uid()
      OR can_edit_client_project(auth.uid(), vs.account_id)
    )
  )
);

-- 3. values_behaviors_selections
DROP POLICY IF EXISTS "Users can manage own behavior selections" ON values_behaviors_selections;

CREATE POLICY "Members can manage behavior selections"
ON values_behaviors_selections
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM values_sessions vs
    WHERE vs.id = values_behaviors_selections.session_id
    AND (
      is_account_member(auth.uid(), vs.account_id)
      OR vs.user_id = auth.uid()
      OR can_edit_client_project(auth.uid(), vs.account_id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM values_sessions vs
    WHERE vs.id = values_behaviors_selections.session_id
    AND (
      is_account_member(auth.uid(), vs.account_id)
      OR vs.user_id = auth.uid()
      OR can_edit_client_project(auth.uid(), vs.account_id)
    )
  )
);

-- 4. values_ratings
DROP POLICY IF EXISTS "Users can manage own ratings" ON values_ratings;

CREATE POLICY "Members can manage ratings"
ON values_ratings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM values_sessions vs
    WHERE vs.id = values_ratings.session_id
    AND (
      is_account_member(auth.uid(), vs.account_id)
      OR vs.user_id = auth.uid()
      OR can_edit_client_project(auth.uid(), vs.account_id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM values_sessions vs
    WHERE vs.id = values_ratings.session_id
    AND (
      is_account_member(auth.uid(), vs.account_id)
      OR vs.user_id = auth.uid()
      OR can_edit_client_project(auth.uid(), vs.account_id)
    )
  )
);

-- 5. values_open_answers
DROP POLICY IF EXISTS "Users can manage own open answers" ON values_open_answers;

CREATE POLICY "Members can manage open answers"
ON values_open_answers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM values_sessions vs
    WHERE vs.id = values_open_answers.session_id
    AND (
      is_account_member(auth.uid(), vs.account_id)
      OR vs.user_id = auth.uid()
      OR can_edit_client_project(auth.uid(), vs.account_id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM values_sessions vs
    WHERE vs.id = values_open_answers.session_id
    AND (
      is_account_member(auth.uid(), vs.account_id)
      OR vs.user_id = auth.uid()
      OR can_edit_client_project(auth.uid(), vs.account_id)
    )
  )
);

-- 6. values_final_check
DROP POLICY IF EXISTS "Users can manage own final check" ON values_final_check;

CREATE POLICY "Members can manage final check"
ON values_final_check
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM values_sessions vs
    WHERE vs.id = values_final_check.session_id
    AND (
      is_account_member(auth.uid(), vs.account_id)
      OR vs.user_id = auth.uid()
      OR can_edit_client_project(auth.uid(), vs.account_id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM values_sessions vs
    WHERE vs.id = values_final_check.session_id
    AND (
      is_account_member(auth.uid(), vs.account_id)
      OR vs.user_id = auth.uid()
      OR can_edit_client_project(auth.uid(), vs.account_id)
    )
  )
);

-- 7. values_company_info
DROP POLICY IF EXISTS "Users can manage own company info" ON values_company_info;

CREATE POLICY "Members can manage company info"
ON values_company_info
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM values_sessions vs
    WHERE vs.id = values_company_info.session_id
    AND (
      is_account_member(auth.uid(), vs.account_id)
      OR vs.user_id = auth.uid()
      OR can_edit_client_project(auth.uid(), vs.account_id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM values_sessions vs
    WHERE vs.id = values_company_info.session_id
    AND (
      is_account_member(auth.uid(), vs.account_id)
      OR vs.user_id = auth.uid()
      OR can_edit_client_project(auth.uid(), vs.account_id)
    )
  )
);
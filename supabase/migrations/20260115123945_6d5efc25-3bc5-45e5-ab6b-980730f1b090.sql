-- =====================================================
-- FIX: RLS Policies for Consulting Mode Access
-- Enable consultants/EP Partners to view client culture data
-- =====================================================

-- 1. event_items - Allow consultants to access event items via session
DROP POLICY IF EXISTS "Users can manage own items" ON event_items;
CREATE POLICY "Members can manage event items" ON event_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM event_sessions es
    WHERE es.id = event_items.session_id
    AND (
      es.user_id = auth.uid()
      OR is_account_member(auth.uid(), es.account_id)
      OR can_edit_client_project(auth.uid(), es.account_id)
    )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM event_sessions es
    WHERE es.id = event_items.session_id
    AND (
      es.user_id = auth.uid()
      OR is_account_member(auth.uid(), es.account_id)
      OR can_edit_client_project(auth.uid(), es.account_id)
    )
  )
);

-- 2. ritual_items - Allow consultants to access ritual items via session
DROP POLICY IF EXISTS "Users can manage own items" ON ritual_items;
CREATE POLICY "Members can manage ritual items" ON ritual_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM ritual_sessions rs
    WHERE rs.id = ritual_items.session_id
    AND (
      rs.user_id = auth.uid()
      OR is_account_member(auth.uid(), rs.account_id)
      OR can_edit_client_project(auth.uid(), rs.account_id)
    )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM ritual_sessions rs
    WHERE rs.id = ritual_items.session_id
    AND (
      rs.user_id = auth.uid()
      OR is_account_member(auth.uid(), rs.account_id)
      OR can_edit_client_project(auth.uid(), rs.account_id)
    )
  )
);

-- 3. decision_answers - Allow consultants to access decision answers via session
DROP POLICY IF EXISTS "Users can manage own answers" ON decision_answers;
CREATE POLICY "Members can manage decision answers" ON decision_answers FOR ALL USING (
  EXISTS (
    SELECT 1 FROM decision_sessions ds
    WHERE ds.id = decision_answers.session_id
    AND (
      ds.user_id = auth.uid()
      OR is_account_member(auth.uid(), ds.account_id)
      OR can_edit_client_project(auth.uid(), ds.account_id)
    )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM decision_sessions ds
    WHERE ds.id = decision_answers.session_id
    AND (
      ds.user_id = auth.uid()
      OR is_account_member(auth.uid(), ds.account_id)
      OR can_edit_client_project(auth.uid(), ds.account_id)
    )
  )
);

-- 4. culture_code_sessions - Add consultant access to SELECT and UPDATE
DROP POLICY IF EXISTS "Users can view their account culture code sessions" ON culture_code_sessions;
CREATE POLICY "Members can view culture code sessions" ON culture_code_sessions FOR SELECT USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "Users can update their account culture code sessions" ON culture_code_sessions;
CREATE POLICY "Members can update culture code sessions" ON culture_code_sessions FOR UPDATE USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
) WITH CHECK (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "Users can insert culture code sessions" ON culture_code_sessions;
CREATE POLICY "Members can insert culture code sessions" ON culture_code_sessions FOR INSERT WITH CHECK (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

-- 5. values_questions_items - Allow consultants to access via session
DROP POLICY IF EXISTS "Users can manage items through session" ON values_questions_items;
CREATE POLICY "Members can manage questions items" ON values_questions_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM values_questions_sessions s
    WHERE s.id = values_questions_items.session_id
    AND (
      s.user_id = auth.uid()
      OR is_account_member(auth.uid(), s.account_id)
      OR can_edit_client_project(auth.uid(), s.account_id)
    )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM values_questions_sessions s
    WHERE s.id = values_questions_items.session_id
    AND (
      s.user_id = auth.uid()
      OR is_account_member(auth.uid(), s.account_id)
      OR can_edit_client_project(auth.uid(), s.account_id)
    )
  )
);

-- 6. values_questions_sessions - Add consultant access
DROP POLICY IF EXISTS "Users can view their sessions" ON values_questions_sessions;
CREATE POLICY "Members can view questions sessions" ON values_questions_sessions FOR SELECT USING (
  user_id = auth.uid()
  OR is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "Users can update their sessions" ON values_questions_sessions;
CREATE POLICY "Members can update questions sessions" ON values_questions_sessions FOR UPDATE USING (
  user_id = auth.uid()
  OR is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
) WITH CHECK (
  user_id = auth.uid()
  OR is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "Users can insert their sessions" ON values_questions_sessions;
CREATE POLICY "Members can insert questions sessions" ON values_questions_sessions FOR INSERT WITH CHECK (
  user_id = auth.uid()
  OR is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

-- 7. values_version_history - Allow consultants to access via values_sessions
DROP POLICY IF EXISTS "Members can manage values history" ON values_version_history;
DROP POLICY IF EXISTS "Users can manage values history" ON values_version_history;
CREATE POLICY "Members can manage values history" ON values_version_history FOR ALL USING (
  EXISTS (
    SELECT 1 FROM values_sessions vs
    WHERE vs.id = values_version_history.session_id
    AND (
      vs.user_id = auth.uid()
      OR is_account_member(auth.uid(), vs.account_id)
      OR can_edit_client_project(auth.uid(), vs.account_id)
    )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM values_sessions vs
    WHERE vs.id = values_version_history.session_id
    AND (
      vs.user_id = auth.uid()
      OR is_account_member(auth.uid(), vs.account_id)
      OR can_edit_client_project(auth.uid(), vs.account_id)
    )
  )
);
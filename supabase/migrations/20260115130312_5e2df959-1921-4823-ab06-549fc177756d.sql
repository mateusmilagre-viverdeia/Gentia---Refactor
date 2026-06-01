-- =====================================================
-- FIX: RLS Policies for Consulting Mode - Complete Fix
-- Enable consultants to view/edit all client data for progress tracking
-- =====================================================

-- 1. event_version_history - Fix RLS for consultants
DROP POLICY IF EXISTS "Members can manage event history" ON event_version_history;
DROP POLICY IF EXISTS "Users can manage event history" ON event_version_history;
CREATE POLICY "Members can manage event history" ON event_version_history FOR ALL USING (
  EXISTS (
    SELECT 1 FROM event_sessions es
    WHERE es.id = event_version_history.session_id
    AND (
      es.user_id = auth.uid()
      OR is_account_member(auth.uid(), es.account_id)
      OR can_edit_client_project(auth.uid(), es.account_id)
    )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM event_sessions es
    WHERE es.id = event_version_history.session_id
    AND (
      es.user_id = auth.uid()
      OR is_account_member(auth.uid(), es.account_id)
      OR can_edit_client_project(auth.uid(), es.account_id)
    )
  )
);

-- 2. ritual_version_history - Fix RLS for consultants
DROP POLICY IF EXISTS "Members can manage ritual history" ON ritual_version_history;
DROP POLICY IF EXISTS "Users can manage ritual history" ON ritual_version_history;
CREATE POLICY "Members can manage ritual history" ON ritual_version_history FOR ALL USING (
  EXISTS (
    SELECT 1 FROM ritual_sessions rs
    WHERE rs.id = ritual_version_history.session_id
    AND (
      rs.user_id = auth.uid()
      OR is_account_member(auth.uid(), rs.account_id)
      OR can_edit_client_project(auth.uid(), rs.account_id)
    )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM ritual_sessions rs
    WHERE rs.id = ritual_version_history.session_id
    AND (
      rs.user_id = auth.uid()
      OR is_account_member(auth.uid(), rs.account_id)
      OR can_edit_client_project(auth.uid(), rs.account_id)
    )
  )
);

-- 3. hiring_funnels - Add consultant access
DROP POLICY IF EXISTS "Users can view their company hiring funnels" ON hiring_funnels;
DROP POLICY IF EXISTS "Members can view hiring funnels" ON hiring_funnels;
CREATE POLICY "Members can view hiring funnels" ON hiring_funnels FOR SELECT USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "Users can insert hiring funnels" ON hiring_funnels;
DROP POLICY IF EXISTS "Members can insert hiring funnels" ON hiring_funnels;
CREATE POLICY "Members can insert hiring funnels" ON hiring_funnels FOR INSERT WITH CHECK (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "Users can update their company hiring funnels" ON hiring_funnels;
DROP POLICY IF EXISTS "Members can update hiring funnels" ON hiring_funnels;
CREATE POLICY "Members can update hiring funnels" ON hiring_funnels FOR UPDATE USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
) WITH CHECK (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "Users can delete their company hiring funnels" ON hiring_funnels;
DROP POLICY IF EXISTS "Members can delete hiring funnels" ON hiring_funnels;
CREATE POLICY "Members can delete hiring funnels" ON hiring_funnels FOR DELETE USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

-- 4. org_charts - Add consultant access
DROP POLICY IF EXISTS "Users can view their company org charts" ON org_charts;
DROP POLICY IF EXISTS "Members can view org charts" ON org_charts;
CREATE POLICY "Members can view org charts" ON org_charts FOR SELECT USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "Users can insert org charts" ON org_charts;
DROP POLICY IF EXISTS "Members can insert org charts" ON org_charts;
CREATE POLICY "Members can insert org charts" ON org_charts FOR INSERT WITH CHECK (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "Users can update their company org charts" ON org_charts;
DROP POLICY IF EXISTS "Members can update org charts" ON org_charts;
CREATE POLICY "Members can update org charts" ON org_charts FOR UPDATE USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
) WITH CHECK (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "Users can delete their company org charts" ON org_charts;
DROP POLICY IF EXISTS "Members can delete org charts" ON org_charts;
CREATE POLICY "Members can delete org charts" ON org_charts FOR DELETE USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

-- 5. selling_company_sessions - Add consultant access
DROP POLICY IF EXISTS "Users can view their account selling sessions" ON selling_company_sessions;
DROP POLICY IF EXISTS "Members can view selling sessions" ON selling_company_sessions;
CREATE POLICY "Members can view selling sessions" ON selling_company_sessions FOR SELECT USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "Users can insert selling sessions" ON selling_company_sessions;
DROP POLICY IF EXISTS "Members can insert selling sessions" ON selling_company_sessions;
CREATE POLICY "Members can insert selling sessions" ON selling_company_sessions FOR INSERT WITH CHECK (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "Users can update their account selling sessions" ON selling_company_sessions;
DROP POLICY IF EXISTS "Members can update selling sessions" ON selling_company_sessions;
CREATE POLICY "Members can update selling sessions" ON selling_company_sessions FOR UPDATE USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
) WITH CHECK (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

-- 6. people_analyses - Add consultant access (only admins/owners currently)
DROP POLICY IF EXISTS "Admins and owners can view people analyses" ON people_analyses;
DROP POLICY IF EXISTS "Members can view people analyses" ON people_analyses;
CREATE POLICY "Members can view people analyses" ON people_analyses FOR SELECT USING (
  is_account_admin_or_owner(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "Admins and owners can insert people analyses" ON people_analyses;
DROP POLICY IF EXISTS "Members can insert people analyses" ON people_analyses;
CREATE POLICY "Members can insert people analyses" ON people_analyses FOR INSERT WITH CHECK (
  is_account_admin_or_owner(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "Admins and owners can update people analyses" ON people_analyses;
DROP POLICY IF EXISTS "Members can update people analyses" ON people_analyses;
CREATE POLICY "Members can update people analyses" ON people_analyses FOR UPDATE USING (
  is_account_admin_or_owner(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
) WITH CHECK (
  is_account_admin_or_owner(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "Admins and owners can delete people analyses" ON people_analyses;
DROP POLICY IF EXISTS "Members can delete people analyses" ON people_analyses;
CREATE POLICY "Members can delete people analyses" ON people_analyses FOR DELETE USING (
  is_account_admin_or_owner(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

-- 7. performance_assessments - Add consultant access
DROP POLICY IF EXISTS "Members can view performance assessments" ON performance_assessments;
CREATE POLICY "Members can view performance assessments" ON performance_assessments FOR SELECT USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "Members can insert performance assessments" ON performance_assessments;
CREATE POLICY "Members can insert performance assessments" ON performance_assessments FOR INSERT WITH CHECK (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "Members can update performance assessments" ON performance_assessments;
CREATE POLICY "Members can update performance assessments" ON performance_assessments FOR UPDATE USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
) WITH CHECK (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "Members can delete performance assessments" ON performance_assessments;
CREATE POLICY "Members can delete performance assessments" ON performance_assessments FOR DELETE USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

-- 8. unique_ability_analyses - Add consultant access
DROP POLICY IF EXISTS "Members can view unique ability analyses" ON unique_ability_analyses;
CREATE POLICY "Members can view unique ability analyses" ON unique_ability_analyses FOR SELECT USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "Members can insert unique ability analyses" ON unique_ability_analyses;
CREATE POLICY "Members can insert unique ability analyses" ON unique_ability_analyses FOR INSERT WITH CHECK (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "Members can update unique ability analyses" ON unique_ability_analyses;
CREATE POLICY "Members can update unique ability analyses" ON unique_ability_analyses FOR UPDATE USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
) WITH CHECK (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "Members can delete unique ability analyses" ON unique_ability_analyses;
CREATE POLICY "Members can delete unique ability analyses" ON unique_ability_analyses FOR DELETE USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

-- 9. team_maturity_assessments - Add consultant access
DROP POLICY IF EXISTS "Members can view team maturity assessments" ON team_maturity_assessments;
CREATE POLICY "Members can view team maturity assessments" ON team_maturity_assessments FOR SELECT USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "Members can insert team maturity assessments" ON team_maturity_assessments;
CREATE POLICY "Members can insert team maturity assessments" ON team_maturity_assessments FOR INSERT WITH CHECK (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "Members can update team maturity assessments" ON team_maturity_assessments;
CREATE POLICY "Members can update team maturity assessments" ON team_maturity_assessments FOR UPDATE USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
) WITH CHECK (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);

DROP POLICY IF EXISTS "Members can delete team maturity assessments" ON team_maturity_assessments;
CREATE POLICY "Members can delete team maturity assessments" ON team_maturity_assessments FOR DELETE USING (
  is_account_member(auth.uid(), account_id)
  OR can_edit_client_project(auth.uid(), account_id)
);
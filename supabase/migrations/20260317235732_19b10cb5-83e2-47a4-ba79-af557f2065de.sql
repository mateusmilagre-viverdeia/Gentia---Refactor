
-- DROP existing policies
DROP POLICY IF EXISTS "Members can view funnel stages" ON hiring_funnel_stages;
DROP POLICY IF EXISTS "Members can create funnel stages" ON hiring_funnel_stages;
DROP POLICY IF EXISTS "Members can update funnel stages" ON hiring_funnel_stages;
DROP POLICY IF EXISTS "Members can delete funnel stages" ON hiring_funnel_stages;

-- SELECT
CREATE POLICY "Members can view funnel stages" ON hiring_funnel_stages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM hiring_funnels hf
      WHERE hf.id = hiring_funnel_stages.funnel_id
      AND (is_account_member(auth.uid(), hf.account_id)
           OR can_edit_client_project(auth.uid(), hf.account_id))
    )
  );

-- INSERT
CREATE POLICY "Members can create funnel stages" ON hiring_funnel_stages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM hiring_funnels hf
      WHERE hf.id = hiring_funnel_stages.funnel_id
      AND (is_account_member(auth.uid(), hf.account_id)
           OR can_edit_client_project(auth.uid(), hf.account_id))
    )
  );

-- UPDATE
CREATE POLICY "Members can update funnel stages" ON hiring_funnel_stages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM hiring_funnels hf
      WHERE hf.id = hiring_funnel_stages.funnel_id
      AND (is_account_member(auth.uid(), hf.account_id)
           OR can_edit_client_project(auth.uid(), hf.account_id))
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM hiring_funnels hf
      WHERE hf.id = hiring_funnel_stages.funnel_id
      AND (is_account_member(auth.uid(), hf.account_id)
           OR can_edit_client_project(auth.uid(), hf.account_id))
    )
  );

-- DELETE
CREATE POLICY "Members can delete funnel stages" ON hiring_funnel_stages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM hiring_funnels hf
      WHERE hf.id = hiring_funnel_stages.funnel_id
      AND (is_account_member(auth.uid(), hf.account_id)
           OR can_edit_client_project(auth.uid(), hf.account_id))
    )
  );

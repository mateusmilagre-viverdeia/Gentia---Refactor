DROP POLICY IF EXISTS "Users can view nodes from their account org charts" ON public.org_chart_nodes;
DROP POLICY IF EXISTS "Users can create nodes in their account org charts" ON public.org_chart_nodes;
DROP POLICY IF EXISTS "Users can update nodes in their account org charts" ON public.org_chart_nodes;
DROP POLICY IF EXISTS "Users can delete nodes from their account org charts" ON public.org_chart_nodes;
DROP POLICY IF EXISTS "Users can view org chart nodes" ON public.org_chart_nodes;
DROP POLICY IF EXISTS "Users can insert org chart nodes" ON public.org_chart_nodes;
DROP POLICY IF EXISTS "Users can update org chart nodes" ON public.org_chart_nodes;
DROP POLICY IF EXISTS "Users can delete org chart nodes" ON public.org_chart_nodes;

CREATE POLICY "View org chart nodes (members + consultants)"
ON public.org_chart_nodes FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_charts oc
    WHERE oc.id = org_chart_nodes.chart_id
      AND (public.is_account_member(auth.uid(), oc.account_id)
           OR public.can_edit_client_project(auth.uid(), oc.account_id))
  )
);

CREATE POLICY "Insert org chart nodes (members + consultants)"
ON public.org_chart_nodes FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.org_charts oc
    WHERE oc.id = org_chart_nodes.chart_id
      AND (public.is_account_member(auth.uid(), oc.account_id)
           OR public.can_edit_client_project(auth.uid(), oc.account_id))
  )
);

CREATE POLICY "Update org chart nodes (members + consultants)"
ON public.org_chart_nodes FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_charts oc
    WHERE oc.id = org_chart_nodes.chart_id
      AND (public.is_account_member(auth.uid(), oc.account_id)
           OR public.can_edit_client_project(auth.uid(), oc.account_id))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.org_charts oc
    WHERE oc.id = org_chart_nodes.chart_id
      AND (public.is_account_member(auth.uid(), oc.account_id)
           OR public.can_edit_client_project(auth.uid(), oc.account_id))
  )
);

CREATE POLICY "Delete org chart nodes (members + consultants)"
ON public.org_chart_nodes FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.org_charts oc
    WHERE oc.id = org_chart_nodes.chart_id
      AND (public.is_account_member(auth.uid(), oc.account_id)
           OR public.can_edit_client_project(auth.uid(), oc.account_id))
  )
);
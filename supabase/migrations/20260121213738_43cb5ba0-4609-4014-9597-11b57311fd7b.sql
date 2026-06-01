-- Allow EP consultants (delegate access via can_edit_client_project) to operate People Analysis related tables
-- while preserving existing admin/owner access.

-- people_analysis_members
DROP POLICY IF EXISTS "Admins can view analysis members" ON public.people_analysis_members;
DROP POLICY IF EXISTS "Admins can create analysis members" ON public.people_analysis_members;
DROP POLICY IF EXISTS "Admins can update analysis members" ON public.people_analysis_members;
DROP POLICY IF EXISTS "Admins can delete analysis members" ON public.people_analysis_members;

CREATE POLICY "Admins can view analysis members"
ON public.people_analysis_members
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.people_analyses pa
    WHERE pa.id = people_analysis_members.analysis_id
      AND (
        public.is_account_admin_or_owner(auth.uid(), pa.account_id)
        OR public.can_edit_client_project(auth.uid(), pa.account_id)
      )
  )
);

CREATE POLICY "Admins can create analysis members"
ON public.people_analysis_members
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.people_analyses pa
    WHERE pa.id = people_analysis_members.analysis_id
      AND (
        public.is_account_admin_or_owner(auth.uid(), pa.account_id)
        OR public.can_edit_client_project(auth.uid(), pa.account_id)
      )
  )
);

CREATE POLICY "Admins can update analysis members"
ON public.people_analysis_members
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.people_analyses pa
    WHERE pa.id = people_analysis_members.analysis_id
      AND (
        public.is_account_admin_or_owner(auth.uid(), pa.account_id)
        OR public.can_edit_client_project(auth.uid(), pa.account_id)
      )
  )
);

CREATE POLICY "Admins can delete analysis members"
ON public.people_analysis_members
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.people_analyses pa
    WHERE pa.id = people_analysis_members.analysis_id
      AND (
        public.is_account_admin_or_owner(auth.uid(), pa.account_id)
        OR public.can_edit_client_project(auth.uid(), pa.account_id)
      )
  )
);


-- people_analysis_ratings
DROP POLICY IF EXISTS "Admins can view analysis ratings" ON public.people_analysis_ratings;
DROP POLICY IF EXISTS "Admins can create analysis ratings" ON public.people_analysis_ratings;
DROP POLICY IF EXISTS "Admins can update analysis ratings" ON public.people_analysis_ratings;
DROP POLICY IF EXISTS "Admins can delete analysis ratings" ON public.people_analysis_ratings;

CREATE POLICY "Admins can view analysis ratings"
ON public.people_analysis_ratings
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.people_analysis_members pam
    JOIN public.people_analyses pa ON pa.id = pam.analysis_id
    WHERE pam.id = people_analysis_ratings.member_id
      AND (
        public.is_account_admin_or_owner(auth.uid(), pa.account_id)
        OR public.can_edit_client_project(auth.uid(), pa.account_id)
      )
  )
);

CREATE POLICY "Admins can create analysis ratings"
ON public.people_analysis_ratings
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.people_analysis_members pam
    JOIN public.people_analyses pa ON pa.id = pam.analysis_id
    WHERE pam.id = people_analysis_ratings.member_id
      AND (
        public.is_account_admin_or_owner(auth.uid(), pa.account_id)
        OR public.can_edit_client_project(auth.uid(), pa.account_id)
      )
  )
);

CREATE POLICY "Admins can update analysis ratings"
ON public.people_analysis_ratings
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.people_analysis_members pam
    JOIN public.people_analyses pa ON pa.id = pam.analysis_id
    WHERE pam.id = people_analysis_ratings.member_id
      AND (
        public.is_account_admin_or_owner(auth.uid(), pa.account_id)
        OR public.can_edit_client_project(auth.uid(), pa.account_id)
      )
  )
);

CREATE POLICY "Admins can delete analysis ratings"
ON public.people_analysis_ratings
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.people_analysis_members pam
    JOIN public.people_analyses pa ON pa.id = pam.analysis_id
    WHERE pam.id = people_analysis_ratings.member_id
      AND (
        public.is_account_admin_or_owner(auth.uid(), pa.account_id)
        OR public.can_edit_client_project(auth.uid(), pa.account_id)
      )
  )
);


-- people_analysis_version_history
DROP POLICY IF EXISTS "Admins can view analysis version history" ON public.people_analysis_version_history;
DROP POLICY IF EXISTS "Admins can create analysis version history" ON public.people_analysis_version_history;
DROP POLICY IF EXISTS "Admins can delete analysis version history" ON public.people_analysis_version_history;

CREATE POLICY "Admins can view analysis version history"
ON public.people_analysis_version_history
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.people_analyses pa
    WHERE pa.id = people_analysis_version_history.analysis_id
      AND (
        public.is_account_admin_or_owner(auth.uid(), pa.account_id)
        OR public.can_edit_client_project(auth.uid(), pa.account_id)
      )
  )
);

CREATE POLICY "Admins can create analysis version history"
ON public.people_analysis_version_history
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.people_analyses pa
    WHERE pa.id = people_analysis_version_history.analysis_id
      AND (
        public.is_account_admin_or_owner(auth.uid(), pa.account_id)
        OR public.can_edit_client_project(auth.uid(), pa.account_id)
      )
  )
);

CREATE POLICY "Admins can delete analysis version history"
ON public.people_analysis_version_history
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.people_analyses pa
    WHERE pa.id = people_analysis_version_history.analysis_id
      AND (
        public.is_account_admin_or_owner(auth.uid(), pa.account_id)
        OR public.can_edit_client_project(auth.uid(), pa.account_id)
      )
  )
);


-- Create a security definer function to fetch public job data
-- This bypasses RLS issues for public job viewing
CREATE OR REPLACE FUNCTION public.get_public_job(p_job_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_job record;
  v_company record;
  v_job_description record;
BEGIN
  -- Get job data
  SELECT * INTO v_job
  FROM recruitment_jobs
  WHERE id = p_job_id
    AND status = 'active'
    AND is_public = true;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Get company data
  SELECT id, name, slug INTO v_company
  FROM companies
  WHERE id = v_job.account_id;
  
  -- Get job description data
  IF v_job.job_description_id IS NOT NULL THEN
    SELECT 
      id, title, area, mission, responsibilities,
      required_skills, desired_skills, behavioral_competencies,
      development, benefits, indicators
    INTO v_job_description
    FROM job_descriptions
    WHERE id = v_job.job_description_id;
  END IF;
  
  -- Build result JSON
  v_result := json_build_object(
    'job', json_build_object(
      'id', v_job.id,
      'title', v_job.title,
      'description', v_job.description,
      'department', v_job.department,
      'location', v_job.location,
      'employment_type', v_job.employment_type,
      'budget_min', v_job.budget_min,
      'budget_max', v_job.budget_max,
      'status', v_job.status,
      'work_regime', v_job.work_regime,
      'work_modality', v_job.work_modality,
      'hide_salary', v_job.hide_salary,
      'additional_info', v_job.additional_info,
      'created_at', v_job.created_at,
      'job_description_id', v_job.job_description_id,
      'account_id', v_job.account_id
    ),
    'company', CASE WHEN v_company.id IS NOT NULL THEN
      json_build_object(
        'id', v_company.id,
        'name', v_company.name,
        'slug', v_company.slug
      )
    ELSE NULL END,
    'job_description', CASE WHEN v_job_description.id IS NOT NULL THEN
      json_build_object(
        'id', v_job_description.id,
        'title', v_job_description.title,
        'area', v_job_description.area,
        'mission', v_job_description.mission,
        'responsibilities', v_job_description.responsibilities,
        'required_skills', v_job_description.required_skills,
        'desired_skills', v_job_description.desired_skills,
        'behavioral_competencies', v_job_description.behavioral_competencies,
        'development', v_job_description.development,
        'benefits', v_job_description.benefits,
        'indicators', v_job_description.indicators
      )
    ELSE NULL END
  );
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_public_job(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_job(uuid) TO authenticated;

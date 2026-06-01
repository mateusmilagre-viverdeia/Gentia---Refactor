-- Phase 1: Add hierarchy fields to pulse_user_profiles
ALTER TABLE pulse_user_profiles 
ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS org_node_id uuid REFERENCES org_chart_nodes(id),
ADD COLUMN IF NOT EXISTS job_title text;

-- Create indexes for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_pulse_user_profiles_manager_id ON pulse_user_profiles(manager_id);
CREATE INDEX IF NOT EXISTS idx_pulse_user_profiles_org_node_id ON pulse_user_profiles(org_node_id);

-- Function to get all subordinates recursively
CREATE OR REPLACE FUNCTION get_all_subordinates(p_manager_id uuid, p_account_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE subordinates AS (
    -- Direct subordinates
    SELECT user_id 
    FROM pulse_user_profiles 
    WHERE manager_id = p_manager_id 
      AND account_id = p_account_id
      AND is_active = true
    
    UNION
    
    -- Subordinates of subordinates (recursive)
    SELECT pup.user_id 
    FROM pulse_user_profiles pup
    INNER JOIN subordinates s ON pup.manager_id = s.user_id
    WHERE pup.account_id = p_account_id
      AND pup.is_active = true
  )
  SELECT COALESCE(ARRAY_AGG(user_id), ARRAY[]::uuid[]) FROM subordinates;
$$;

-- Function to check if viewer can see target user's data
CREATE OR REPLACE FUNCTION can_view_subordinate(
  p_viewer_id uuid, 
  p_target_id uuid, 
  p_account_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Admin/Owner can see everyone
    is_account_admin_or_owner(p_viewer_id, p_account_id)
    OR is_pulse_admin(p_viewer_id, p_account_id)
    -- Target is in viewer's subordinates
    OR p_target_id = ANY(get_all_subordinates(p_viewer_id, p_account_id))
    -- Viewer is the target user themselves
    OR p_viewer_id = p_target_id;
$$;

-- Trigger function to sync user with org chart when org_node_id changes
CREATE OR REPLACE FUNCTION sync_user_to_org_chart()
RETURNS trigger AS $$
DECLARE
  v_user_name text;
  v_old_people jsonb;
  v_new_people jsonb;
  v_person_entry jsonb;
BEGIN
  -- Get user name from profiles
  SELECT CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))::text INTO v_user_name
  FROM profiles WHERE id = NEW.user_id;
  
  v_user_name := TRIM(v_user_name);

  -- If org_node_id changed
  IF NEW.org_node_id IS DISTINCT FROM OLD.org_node_id THEN
    -- Remove from old node if exists
    IF OLD.org_node_id IS NOT NULL THEN
      SELECT people INTO v_old_people FROM org_chart_nodes WHERE id = OLD.org_node_id;
      
      IF v_old_people IS NOT NULL AND jsonb_typeof(v_old_people) = 'array' THEN
        -- Filter out the user from the array
        SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_new_people
        FROM jsonb_array_elements(v_old_people) elem
        WHERE (elem->>'id') IS NULL OR (elem->>'id') != OLD.user_id::text;
        
        UPDATE org_chart_nodes SET people = v_new_people WHERE id = OLD.org_node_id;
      END IF;
    END IF;
    
    -- Add to new node if exists
    IF NEW.org_node_id IS NOT NULL THEN
      v_person_entry := jsonb_build_object('id', NEW.user_id::text, 'name', v_user_name, 'avatar', null);
      
      UPDATE org_chart_nodes 
      SET people = COALESCE(people, '[]'::jsonb) || v_person_entry
      WHERE id = NEW.org_node_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for sync
DROP TRIGGER IF EXISTS trigger_sync_user_org_chart ON pulse_user_profiles;
CREATE TRIGGER trigger_sync_user_org_chart
  AFTER INSERT OR UPDATE OF org_node_id ON pulse_user_profiles
  FOR EACH ROW EXECUTE FUNCTION sync_user_to_org_chart();
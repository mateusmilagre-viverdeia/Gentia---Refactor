-- Add filter-related columns to people_analysis_members
ALTER TABLE people_analysis_members 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES pulse_teams(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS org_node_id uuid REFERENCES org_chart_nodes(id) ON DELETE SET NULL;

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_people_analysis_members_user_id ON people_analysis_members(user_id);
CREATE INDEX IF NOT EXISTS idx_people_analysis_members_team_id ON people_analysis_members(team_id);
CREATE INDEX IF NOT EXISTS idx_people_analysis_members_org_node_id ON people_analysis_members(org_node_id);
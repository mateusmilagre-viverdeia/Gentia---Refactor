-- Adicionar campo team_id em disc_sessions para permitir agrupamento por time
ALTER TABLE disc_sessions 
ADD COLUMN team_id UUID REFERENCES pulse_teams(id) ON DELETE SET NULL;

-- Index para performance nas queries de time
CREATE INDEX idx_disc_sessions_team_id ON disc_sessions(team_id);
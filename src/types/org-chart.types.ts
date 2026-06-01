export type VacancyStatus = 'active' | 'vacant';

export type NodeType = 'cargo' | 'diretoria' | 'gerencia' | 'coordenacao' | 'time' | 'squad';

export interface NodeTag {
  text: string;
  color: string;
}

export interface NodePerson {
  name: string;
  avatar: string | null;
}

export interface OrgChart {
  id: string;
  account_id: string;
  name: string;
  description: string | null;
  is_default: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface OrgChartNode {
  id: string;
  chart_id: string;
  parent_id: string | null;
  position: number;
  title: string;
  person_name: string | null;
  person_avatar: string | null;
  roles: string[];
  color: string | null;
  notes: string | null;
  tags: NodeTag[] | null;
  people: NodePerson[] | null;
  vacancy_status: VacancyStatus;
  // Organization fields
  node_type: NodeType | null;
  maturity_level: number | null;
  capacity_score: number | null;
  key_competencies: string[] | null;
  competency_gaps: string[] | null;
  created_at: string;
}

export interface OrgChartNodeWithChildren extends OrgChartNode {
  children: OrgChartNodeWithChildren[];
}

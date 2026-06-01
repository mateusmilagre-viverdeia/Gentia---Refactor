// AI Recommendations Types

export type RecommendationCategory = 
  | 'health_improvement' 
  | 'next_action' 
  | 'risk_mitigation' 
  | 'quick_win' 
  | 'best_practice';

export type RecommendationPriority = 'high' | 'medium' | 'low';

export type RecommendationStatus = 'pending' | 'accepted' | 'dismissed' | 'completed';

export type FeedbackType = 'helpful' | 'not_helpful' | 'implemented' | 'incorrect';

export interface SuggestedTool {
  id: string;
  name: string;
  route: string;
  pillar?: string;
  icon?: string;
}

export interface ProjectRecommendation {
  id: string;
  account_id: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  title: string;
  description: string;
  rationale: string | null;
  suggested_tools: SuggestedTool[];
  expected_impact: string | null;
  status: RecommendationStatus;
  accepted_at: string | null;
  dismissed_at: string | null;
  dismissed_reason: string | null;
  completed_at: string | null;
  completion_notes: string | null;
  created_by: string;
  expires_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RecommendationFeedback {
  id: string;
  recommendation_id: string;
  feedback_type: FeedbackType;
  comment: string | null;
  created_by: string;
  created_at: string;
}

export interface SuccessPattern {
  id: string;
  pattern_type: string;
  pattern_name: string;
  conditions: Record<string, unknown>;
  outcomes: Record<string, unknown>;
  sample_size: number;
  confidence: number;
  is_active: boolean;
  last_calculated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecommendationGenerationLog {
  id: string;
  account_id: string;
  generated_at: string;
  recommendations_count: number;
  context: string | null;
  success: boolean;
  error_message: string | null;
}

// UI Helper Types
export interface RecommendationCategoryInfo {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

export const RECOMMENDATION_CATEGORIES: Record<RecommendationCategory, RecommendationCategoryInfo> = {
  health_improvement: {
    label: 'Melhoria de Saúde',
    icon: 'Heart',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  next_action: {
    label: 'Próxima Ação',
    icon: 'ArrowRight',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  risk_mitigation: {
    label: 'Mitigação de Risco',
    icon: 'ShieldAlert',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  quick_win: {
    label: 'Vitória Rápida',
    icon: 'Zap',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
  },
  best_practice: {
    label: 'Melhor Prática',
    icon: 'Award',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
};

export const PRIORITY_INFO: Record<RecommendationPriority, { label: string; color: string; bgColor: string }> = {
  high: { label: 'Alta', color: 'text-red-700', bgColor: 'bg-red-100' },
  medium: { label: 'Média', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  low: { label: 'Baixa', color: 'text-green-700', bgColor: 'bg-green-100' },
};

export const STATUS_INFO: Record<RecommendationStatus, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'text-gray-600' },
  accepted: { label: 'Aceita', color: 'text-blue-600' },
  dismissed: { label: 'Descartada', color: 'text-gray-400' },
  completed: { label: 'Concluída', color: 'text-green-600' },
};

// Generate Recommendations Request/Response
export interface GenerateRecommendationsRequest {
  account_id: string;
  context?: 'dashboard' | 'checkpoint' | 'alert_response';
  max_recommendations?: number;
}

export interface GenerateRecommendationsResponse {
  recommendations: Array<{
    category: RecommendationCategory;
    priority: RecommendationPriority;
    title: string;
    description: string;
    rationale: string;
    suggested_tools: SuggestedTool[];
    expected_impact: string;
  }>;
  analysis_summary: string;
}

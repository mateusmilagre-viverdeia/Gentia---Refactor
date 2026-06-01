export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

export interface Module {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface ModulePermission {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isCustom?: boolean;
}

export interface PermissionMatrixRow {
  module_slug: string;
  module_name: string;
  module_category: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  is_custom: boolean;
}

export interface PermissionTemplate {
  id: string;
  account_id: string | null;
  name: string;
  description: string | null;
  base_role: string | null;
  is_system_default: boolean;
  created_at: string;
}

export interface UserPermission {
  id: string;
  account_member_id: string;
  module_slug: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  created_at: string;
  updated_at: string;
}

export const categoryLabels: Record<string, string> = {
  cultura: 'Cultura',
  diagnostico: 'Onboarding',
  atracao: 'Atração',
  contratacao: 'Contratação',
  retencao: 'Retenção',
  conta: 'Conta',
};

export const actionLabels: Record<PermissionAction, string> = {
  view: 'Ver',
  create: 'Criar',
  edit: 'Editar',
  delete: 'Excluir',
};

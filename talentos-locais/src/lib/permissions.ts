import type { AdminRole, User } from '../types';

/** Permissões administrativas por função (princípio do menor privilégio). */
export type AdminPerm =
  | 'users.view'
  | 'users.pii' // ver e-mail/telefone completos
  | 'users.suspend'
  | 'reports.moderate'
  | 'verifications.review'
  | 'catalog.manage'
  | 'plans.manage'
  | 'orders.view'
  | 'disputes.resolve'
  | 'metrics.view'
  | 'reports.export'
  | 'audit.view';

const MATRIX: Record<AdminRole, AdminPerm[]> = {
  super: ['users.view', 'users.pii', 'users.suspend', 'reports.moderate', 'verifications.review', 'catalog.manage', 'plans.manage', 'orders.view', 'disputes.resolve', 'metrics.view', 'reports.export', 'audit.view'],
  moderador: ['users.view', 'users.suspend', 'reports.moderate', 'verifications.review', 'metrics.view'],
  suporte: ['users.view', 'orders.view', 'disputes.resolve', 'metrics.view'],
};

export const ROLE_LABEL: Record<AdminRole, string> = {
  super: 'Administrador geral',
  moderador: 'Moderação',
  suporte: 'Suporte',
};

export function can(user: User | undefined | null, perm: AdminPerm) {
  if (!user?.adminRole || user.status !== 'active') return false;
  return MATRIX[user.adminRole].includes(perm);
}

export const isAdmin = (u?: User | null) => !!u?.adminRole && u.status === 'active';

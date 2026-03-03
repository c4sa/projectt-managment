// Project-related types and interfaces for RBAC and permissions

export interface ProjectPermissions {
  expenses: boolean;
  income: boolean;
  budget: boolean;
  documents: boolean;
  tasks: boolean;
}

export interface TeamMember {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: 'project_manager' | 'team_member';
  permissions: ProjectPermissions;
  addedAt: string;
  addedBy: string;
}

/** Minimal project shape needed for permission checks */
export interface ProjectForPermissions {
  assignedManagerId?: string;
  teamMembers: Array<{ userId: string; permissions?: ProjectPermissions } | string>;
}

export interface DocumentComment {
  id: string;
  documentId: string;
  userId: string;
  userName: string;
  message: string;
  edited?: boolean;
  editedAt?: string;
  createdAt: string;
}

/** Check if user can access project */
export function canAccessProject(
  userId: string,
  userRole: string,
  project: ProjectForPermissions
): boolean {
  if (userRole === 'admin') return true;
  if (userRole === 'project_manager' && project.assignedManagerId === userId) return true;
  return project.teamMembers?.some((m) =>
    typeof m === 'string' ? m === userId : m.userId === userId
  ) ?? false;
}

/** Check if user has a specific permission on the project */
export function hasPermission(
  userId: string,
  userRole: string,
  project: ProjectForPermissions,
  permission: keyof ProjectPermissions
): boolean {
  if (userRole === 'admin') return true;
  if (userRole === 'project_manager' && project.assignedManagerId === userId) return true;
  const member = project.teamMembers?.find((m) =>
    typeof m === 'string' ? m === userId : m.userId === userId
  );
  if (!member) return false;
  return (typeof member === 'object' && member?.permissions)
    ? member.permissions[permission] ?? false
    : false;
}

export const DEFAULT_TEAM_MEMBER_PERMISSIONS: ProjectPermissions = {
  expenses: false,
  income: false,
  budget: false,
  documents: true,
  tasks: true,
};

export const PROJECT_MANAGER_PERMISSIONS: ProjectPermissions = {
  expenses: true,
  income: true,
  budget: true,
  documents: true,
  tasks: true,
};

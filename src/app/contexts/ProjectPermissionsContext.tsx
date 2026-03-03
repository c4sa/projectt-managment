import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';
import {
  ProjectPermissions,
  ProjectForPermissions,
  canAccessProject,
  hasPermission,
} from '../types/project';

interface ProjectPermissionsContextType {
  canAccessProject: (project: ProjectForPermissions) => boolean;
  hasPermission: (project: ProjectForPermissions, permission: keyof ProjectPermissions) => boolean;
  isProjectManager: (project: ProjectForPermissions) => boolean;
  isAdmin: () => boolean;
  canCreateProject: () => boolean;
  canManageTeam: (project: ProjectForPermissions) => boolean;
}

const ProjectPermissionsContext = createContext<ProjectPermissionsContextType | undefined>(undefined);

export function ProjectPermissionsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const canAccessProjectFn = (project: ProjectForPermissions): boolean => {
    if (!user) return false;
    return canAccessProject(user.id, user.role, project);
  };

  const hasPermissionFn = (
    project: ProjectForPermissions,
    permission: keyof ProjectPermissions
  ): boolean => {
    if (!user) return false;
    return hasPermission(user.id, user.role, project, permission);
  };

  const isProjectManager = (project: ProjectForPermissions): boolean => {
    if (!user) return false;
    return project.assignedManagerId === user.id;
  };

  const isAdmin = (): boolean => user?.role === 'admin';

  const canCreateProject = (): boolean => user?.role === 'admin';

  const canManageTeam = (project: ProjectForPermissions): boolean => {
    if (!user) return false;
    return user.role === 'admin' || project.assignedManagerId === user.id;
  };

  return (
    <ProjectPermissionsContext.Provider
      value={{
        canAccessProject: canAccessProjectFn,
        hasPermission: hasPermissionFn,
        isProjectManager,
        isAdmin,
        canCreateProject,
        canManageTeam,
      }}
    >
      {children}
    </ProjectPermissionsContext.Provider>
  );
}

export function useProjectPermissions() {
  const context = useContext(ProjectPermissionsContext);
  if (context === undefined) {
    throw new Error('useProjectPermissions must be used within a ProjectPermissionsProvider');
  }
  return context;
}

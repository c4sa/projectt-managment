import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { dataStore } from '../data/store';

interface PermissionsMatrixContextType {
  hasPermission: (module: string, action: string) => boolean;
  isLoading: boolean;
}

const PermissionsMatrixContext = createContext<PermissionsMatrixContextType | undefined>(undefined);

export function PermissionsMatrixProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [permissionsByRole, setPermissionsByRole] = useState<Record<string, Record<string, boolean>>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const allPerms = (await dataStore.getRolePermissions()) ?? [];
        const byRole: Record<string, Record<string, boolean>> = {};
        for (const p of allPerms) {
          const roleId = p.roleId ?? p.role_id;
          if (!roleId) continue;
          if (!byRole[roleId]) byRole[roleId] = {};
          const mod = p.module ?? (p as any).module;
          const act = p.action ?? (p as any).action;
          if (mod && act) byRole[roleId][`${mod}:${act}`] = p.allowed === true;
        }
        setPermissionsByRole(byRole);
      } catch (e) {
        // Graceful fallback: role_permissions table may not exist yet or API may be unavailable
        // Admins still get full access via hasPermission when no rolePerms
        setPermissionsByRole({});
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const hasPermission = (module: string, action: string): boolean => {
    if (!user) return false;
    const effectiveRoleId = user.customRoleId || user.role;
    const rolePerms = permissionsByRole[effectiveRoleId];
    if (!rolePerms) {
      if (user.role === 'admin') return true;
      return false;
    }
    const key = `${module}:${action}`;
    return rolePerms[key] ?? false;
  };

  return (
    <PermissionsMatrixContext.Provider value={{ hasPermission, isLoading }}>
      {children}
    </PermissionsMatrixContext.Provider>
  );
}

export function usePermissionsMatrix() {
  const context = useContext(PermissionsMatrixContext);
  if (context === undefined) {
    throw new Error('usePermissionsMatrix must be used within a PermissionsMatrixProvider');
  }
  return context;
}

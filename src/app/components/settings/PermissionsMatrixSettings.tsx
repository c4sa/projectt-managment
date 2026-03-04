import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Save, Plus, Trash2, Shield, Lock, Unlock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { dataStore } from '../../data/store';

interface ModulePermissions {
  module: string;
  displayName: string;
  actions: { id: string; name: string; description: string }[];
}

const MODULES: ModulePermissions[] = [
  { module: 'dashboard', displayName: 'Dashboard', actions: [
    { id: 'view', name: 'View Dashboard', description: 'Access dashboard page' },
    { id: 'view_all_projects', name: 'View All Projects', description: 'See all projects in dashboard' },
    { id: 'view_financial', name: 'View Financial Data', description: 'See financial KPIs and reports' },
  ]},
  { module: 'projects', displayName: 'Projects', actions: [
    { id: 'view', name: 'View Projects', description: 'View project list and details' },
    { id: 'view_all', name: 'View All Projects', description: 'Access all projects, not just assigned' },
    { id: 'create', name: 'Create Projects', description: 'Create new projects' },
    { id: 'edit', name: 'Edit Projects', description: 'Modify project details' },
    { id: 'delete', name: 'Delete Projects', description: 'Remove projects from system' },
    { id: 'archive', name: 'Archive Projects', description: 'Archive completed projects' },
  ]},
  { module: 'tasks', displayName: 'Tasks', actions: [
    { id: 'view', name: 'View Tasks', description: 'See assigned tasks' },
    { id: 'view_all', name: 'View All Tasks', description: 'See all project tasks' },
    { id: 'create', name: 'Create Tasks', description: 'Add new tasks' },
    { id: 'edit', name: 'Edit Tasks', description: 'Modify task details' },
    { id: 'delete', name: 'Delete Tasks', description: 'Remove tasks' },
    { id: 'assign', name: 'Assign Tasks', description: 'Assign tasks to team members' },
    { id: 'update_status', name: 'Update Status', description: 'Change task status' },
  ]},
  { module: 'budget', displayName: 'Budget Management', actions: [
    { id: 'view', name: 'View Budget', description: 'See budget information' },
    { id: 'create', name: 'Create Budget Items', description: 'Add budget items' },
    { id: 'edit', name: 'Edit Budget', description: 'Modify budget allocations' },
    { id: 'delete', name: 'Delete Budget Items', description: 'Remove budget items' },
    { id: 'manage_categories', name: 'Manage Categories', description: 'Create/edit budget categories' },
  ]},
  { module: 'purchase_orders', displayName: 'Purchase Orders', actions: [
    { id: 'view', name: 'View POs', description: 'See purchase orders' },
    { id: 'create', name: 'Create POs', description: 'Create new purchase orders' },
    { id: 'edit', name: 'Edit POs', description: 'Modify purchase order details' },
    { id: 'delete', name: 'Delete POs', description: 'Remove purchase orders' },
    { id: 'submit', name: 'Submit for Approval', description: 'Submit POs for approval' },
    { id: 'approve', name: 'Approve POs', description: 'Approve purchase orders' },
    { id: 'reject', name: 'Reject POs', description: 'Reject purchase orders' },
  ]},
  { module: 'vendor_invoices', displayName: 'Vendor Invoices', actions: [
    { id: 'view', name: 'View Invoices', description: 'See vendor invoices' },
    { id: 'create', name: 'Create Invoices', description: 'Add new invoices' },
    { id: 'edit', name: 'Edit Invoices', description: 'Modify invoice details' },
    { id: 'delete', name: 'Delete Invoices', description: 'Remove invoices' },
    { id: 'approve', name: 'Approve Invoices', description: 'Approve vendor invoices' },
    { id: 'reject', name: 'Reject Invoices', description: 'Reject vendor invoices' },
  ]},
  { module: 'payments', displayName: 'Payments', actions: [
    { id: 'view', name: 'View Payments', description: 'See payment records' },
    { id: 'create', name: 'Create Payment Requests', description: 'Submit payment requests' },
    { id: 'edit', name: 'Edit Payments', description: 'Modify payment details' },
    { id: 'delete', name: 'Delete Payments', description: 'Remove payment records' },
    { id: 'approve_level1', name: 'Approve (Level 1)', description: 'First level approval' },
    { id: 'approve_level2', name: 'Approve (Level 2)', description: 'Second level approval' },
    { id: 'process', name: 'Process Payments', description: 'Mark payments as paid' },
  ]},
  { module: 'customer_invoices', displayName: 'Customer Invoices', actions: [
    { id: 'view', name: 'View Invoices', description: 'See customer invoices' },
    { id: 'create', name: 'Create Invoices', description: 'Create customer invoices' },
    { id: 'edit', name: 'Edit Invoices', description: 'Modify invoice details' },
    { id: 'delete', name: 'Delete Invoices', description: 'Remove invoices' },
    { id: 'approve', name: 'Approve Invoices', description: 'Approve customer invoices' },
    { id: 'issue', name: 'Issue Invoices', description: 'Send invoices to customers' },
  ]},
  { module: 'vendors', displayName: 'Vendors', actions: [
    { id: 'view', name: 'View Vendors', description: 'See vendor list' },
    { id: 'create', name: 'Create Vendors', description: 'Add new vendors' },
    { id: 'edit', name: 'Edit Vendors', description: 'Modify vendor details' },
    { id: 'delete', name: 'Delete Vendors', description: 'Remove vendors' },
  ]},
  { module: 'customers', displayName: 'Customers', actions: [
    { id: 'view', name: 'View Customers', description: 'See customer list' },
    { id: 'create', name: 'Create Customers', description: 'Add new customers' },
    { id: 'edit', name: 'Edit Customers', description: 'Modify customer details' },
    { id: 'delete', name: 'Delete Customers', description: 'Remove customers' },
  ]},
  { module: 'employees', displayName: 'Employees', actions: [
    { id: 'view', name: 'View Employees', description: 'See employee list' },
    { id: 'view_all', name: 'View All Employees', description: 'See all employee details' },
    { id: 'create', name: 'Create Employees', description: 'Add new employees' },
    { id: 'edit', name: 'Edit Employees', description: 'Modify employee details' },
    { id: 'delete', name: 'Delete Employees', description: 'Remove employees' },
  ]},
  { module: 'documents', displayName: 'Documents', actions: [
    { id: 'view', name: 'View Documents', description: 'See documents' },
    { id: 'upload', name: 'Upload Documents', description: 'Upload new files' },
    { id: 'download', name: 'Download Documents', description: 'Download files' },
    { id: 'delete', name: 'Delete Documents', description: 'Remove documents' },
    { id: 'manage_permissions', name: 'Manage Permissions', description: 'Set document access' },
  ]},
  { module: 'reports', displayName: 'Reports', actions: [
    { id: 'view', name: 'View Reports', description: 'Access reports' },
    { id: 'view_financial', name: 'View Financial Reports', description: 'See financial reports' },
    { id: 'export', name: 'Export Reports', description: 'Download reports' },
  ]},
  { module: 'settings', displayName: 'Settings', actions: [
    { id: 'view', name: 'View Settings', description: 'Access settings page' },
    { id: 'edit_company', name: 'Edit Company Settings', description: 'Modify company information' },
    { id: 'edit_system', name: 'Edit System Settings', description: 'Modify system configuration' },
    { id: 'manage_users', name: 'Manage Users', description: 'Create/edit/delete users' },
    { id: 'manage_roles', name: 'Manage Roles', description: 'Create/edit custom roles' },
  ]},
];

const BUILTIN_ROLES = [
  { id: 'admin', name: 'Administrator', description: 'Full system access', isCustom: false },
  { id: 'project_manager', name: 'Project Manager', description: 'Project-focused role', isCustom: false },
  { id: 'finance', name: 'Finance', description: 'Financial control role', isCustom: false },
  { id: 'employee', name: 'Employee', description: 'Basic operational role', isCustom: false },
];

interface RoleWithPerms {
  id: string;
  name: string;
  description: string;
  isCustom: boolean;
  permissions: Record<string, boolean>;
  permIds: Record<string, string>;
}

export function PermissionsMatrixSettings() {
  const [roles, setRoles] = useState<RoleWithPerms[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleWithPerms | null>(null);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [cloneFromRole, setCloneFromRole] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [customRoles, allPerms] = await Promise.all([
        dataStore.getCustomRoles(),
        dataStore.getRolePermissions(),
      ]);

      const allRoles: RoleWithPerms[] = [
        ...BUILTIN_ROLES.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          isCustom: false,
          permissions: {} as Record<string, boolean>,
          permIds: {} as Record<string, string>,
        })),
        ...customRoles.map((r: any) => ({
          id: r.id,
          name: r.name,
          description: r.description || '',
          isCustom: true,
          permissions: {} as Record<string, boolean>,
          permIds: {} as Record<string, string>,
        })),
      ];

      for (const p of allPerms || []) {
        const role = allRoles.find((r) => r.id === p.roleId);
        if (!role) continue;
        const key = `${p.module}:${p.action}`;
        role.permissions[key] = p.allowed;
        role.permIds[key] = p.id;
      }

      setRoles(allRoles);
      if (allRoles.length > 0 && !selectedRole) setSelectedRole(allRoles[0]);
    } catch (e) {
      console.error('Failed to load permissions', e);
      setRoles(BUILTIN_ROLES.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        isCustom: false,
        permissions: {},
        permIds: {},
      })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const hasPermission = (role: RoleWithPerms, module: string, action: string) => {
    return role.permissions[`${module}:${action}`] ?? false;
  };

  const handleTogglePermission = async (roleId: string, module: string, action: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;
    const key = `${module}:${action}`;
    const current = role.permissions[key] ?? false;
    const newAllowed = !current;

    try {
      const permId = role.permIds[key];
      if (permId) {
        await dataStore.updateRolePermission(permId, { allowed: newAllowed });
      } else {
        const created = await dataStore.addRolePermission({ roleId, module, action, allowed: newAllowed });
        role.permIds[key] = created.id;
      }
      role.permissions[key] = newAllowed;
      setRoles([...roles]);
      if (selectedRole?.id === roleId) {
        setSelectedRole({ ...role });
      }
      toast.success('Permission updated');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update permission');
    }
  };

  const handleSave = () => {
    toast.success('All changes are saved automatically');
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      toast.error('Please enter a role name');
      return;
    }
    try {
      const created = await dataStore.addCustomRole({
        name: newRoleName.trim(),
        description: newRoleDescription.trim(),
      });
      const basePerms = cloneFromRole ? roles.find((r) => r.id === cloneFromRole)?.permissions ?? {} : {};
      const newRole: RoleWithPerms = {
        id: created.id,
        name: created.name ?? newRoleName,
        description: created.description ?? newRoleDescription,
        isCustom: true,
        permissions: { ...basePerms },
        permIds: {},
      };
      if (Object.keys(basePerms).length > 0) {
        for (const [k, v] of Object.entries(basePerms)) {
          if (v) {
            const [mod, act] = k.split(':');
            const p = await dataStore.addRolePermission({
              roleId: created.id,
              module: mod,
              action: act,
              allowed: true,
            });
            newRole.permIds[k] = p.id;
            newRole.permissions[k] = true;
          }
        }
      }
      setRoles((prev) => [...prev, newRole]);
      setSelectedRole(newRole);
      setIsCreatingRole(false);
      setNewRoleName('');
      setNewRoleDescription('');
      setCloneFromRole('');
      toast.success('Custom role created');
    } catch (e: any) {
      toast.error(e.message || 'Failed to create role');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role?.isCustom) {
      toast.error('Cannot delete system roles');
      return;
    }
    try {
      await dataStore.deleteCustomRole(roleId);
      setRoles((prev) => prev.filter((r) => r.id !== roleId));
      if (selectedRole?.id === roleId) setSelectedRole(null);
      setShowDeleteConfirm(false);
      setRoleToDelete(null);
      toast.success('Custom role deleted');
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete role');
    }
  };

  const getModulePermissionCount = (role: RoleWithPerms, module: string) => {
    return MODULES.find((m) => m.module === module)?.actions.filter((a) => hasPermission(role, module, a.id)).length ?? 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7A1516]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Permissions & Roles Management</h3>
          <p className="text-sm text-gray-500">Configure user roles and detailed permissions matrix</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreatingRole(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Create Custom Role
          </Button>
          <Button onClick={handleSave} className="bg-[#7A1516] hover:bg-[#5A1012]">
            <Save className="w-4 h-4 mr-2" />
            Save All Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Available Roles
          </h4>
          {roles.map((role) => {
            const totalPermissions = Object.values(role.permissions).filter(Boolean).length;
            return (
              <Card
                key={role.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedRole?.id === role.id ? 'ring-2 ring-[#7A1516]' : ''
                }`}
                onClick={() => setSelectedRole(role)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {role.name}
                        {!role.isCustom && (
                          <Badge variant="secondary" className="text-xs">
                            <Lock className="w-2 h-2 mr-1" />
                            System
                          </Badge>
                        )}
                        {role.isCustom && (
                          <Badge className="bg-blue-100 text-blue-800 text-xs">Custom</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">{role.description}</CardDescription>
                    </div>
                    {role.isCustom && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRoleToDelete(role.id);
                          setShowDeleteConfirm(true);
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span>{totalPermissions} permissions granted</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {selectedRole && (
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Permissions Matrix</CardTitle>
                    <CardDescription className="text-xs">
                      Configure detailed permissions for {selectedRole.name}
                    </CardDescription>
                  </div>
                  {selectedRole.isCustom ? (
                    <Badge variant="outline" className="text-xs">
                      <Unlock className="w-3 h-3 mr-1" />
                      Editable
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      <Lock className="w-3 h-3 mr-1" />
                      System (Editable)
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {MODULES.map((module) => {
                  const modulePermCount = getModulePermissionCount(selectedRole, module.module);
                  const totalActions = module.actions.length;
                  return (
                    <Card key={module.module} className="border-l-4 border-l-[#7A1516]">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{module.displayName}</CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {modulePermCount} / {totalActions}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {module.actions.map((action) => {
                            const isAllowed = hasPermission(selectedRole, module.module, action.id);
                            return (
                              <div
                                key={action.id}
                                className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    {isAllowed ? (
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                    ) : (
                                      <XCircle className="w-4 h-4 text-gray-300" />
                                    )}
                                    <div>
                                      <p className="text-sm font-medium">{action.name}</p>
                                      <p className="text-xs text-gray-500">{action.description}</p>
                                    </div>
                                  </div>
                                </div>
                                <Switch
                                  checked={isAllowed}
                                  onCheckedChange={() =>
                                    handleTogglePermission(selectedRole.id, module.module, action.id)
                                  }
                                />
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}

        {!selectedRole && (
          <div className="lg:col-span-2 flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select a role to view permissions</p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isCreatingRole} onOpenChange={setIsCreatingRole}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Role</DialogTitle>
            <DialogDescription>Create a new custom role with specific permissions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role Name</Label>
              <Input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g., Site Supervisor"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                placeholder="Describe the role's responsibilities..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Clone Permissions From (Optional)</Label>
              <select
                value={cloneFromRole}
                onChange={(e) => setCloneFromRole(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Start with no permissions</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatingRole(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRole} className="bg-[#7A1516] hover:bg-[#5A1012]">
              <Plus className="w-4 h-4 mr-2" />
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Delete Custom Role
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this role? Users with this role will need to be reassigned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => roleToDelete && handleDeleteRole(roleToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

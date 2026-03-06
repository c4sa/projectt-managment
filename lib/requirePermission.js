/**
 * API-side RBAC: check if user has permission for module+action.
 * Uses app_users.role and role_permissions table.
 * Admin role has full access.
 */
import { supabase } from './supabase.js';

/**
 * @param {string} userId - app user id (payload.sub)
 * @param {string} module - e.g. 'projects', 'vendors', 'customer_invoices'
 * @param {string} action - e.g. 'view', 'create', 'edit', 'delete'
 * @returns {Promise<boolean>}
 */
export async function hasApiPermission(userId, module, action) {
  try {
    const { data: appUser, error: userErr } = await supabase
      .from('app_users')
      .select('role, custom_role_id')
      .eq('id', userId)
      .maybeSingle();

    if (userErr || !appUser) return false;
    if (appUser.role === 'admin') return true;

    const roleId = appUser.custom_role_id || appUser.role;

    const { data: perms, error: permErr } = await supabase
      .from('role_permissions')
      .select('module, action, allowed')
      .eq('role_id', roleId)
      .eq('allowed', true);

    if (permErr || !perms?.length) return false;

    return perms.some((p) => p.module === module && p.action === action);
  } catch (e) {
    console.error('[hasApiPermission] error:', e);
    return false;
  }
}

/**
 * Map API entity + method to required (module, action).
 * @param {string} entity - URL segment e.g. 'projects', 'vendorInvoices', 'purchase-orders'
 * @param {string} method - GET, POST, PUT, DELETE
 * @param {string} [id] - for GET/PUT/DELETE with :id
 * @returns {{ module: string, action: string } | null} - null = no RBAC (skip check)
 */
export function entityToPermission(entity, method, id) {
  const hasId = !!id;

  const ENTITY_MODULE = {
    customers: 'customers',
    vendors: 'vendors',
    employees: 'employees',
    projects: 'projects',
    tasks: 'tasks',
    taskGroups: 'tasks',
    budgetItems: 'budget',
    'purchase-orders': 'purchase_orders',
    variationOrders: 'purchase_orders',
    vendorInvoices: 'vendor_invoices',
    vendorClaims: 'vendor_invoices',
    customerInvoices: 'customer_invoices',
    paymentRequests: 'payments',
    payments: 'payments',
    documents: 'documents',
    'document-folders': 'documents',
    'document-activities': 'documents',
    documentComments: 'documents',
    projectChatMessages: 'documents',
    users: 'settings',
    approvalWorkflows: 'settings',
    'custom-roles': 'settings',
    'role-permissions': 'settings',
    printTemplates: 'settings',
    projectManpower: 'projects',
    manpowerMembers: 'projects',
  };

  const module = ENTITY_MODULE[entity];
  if (!module) return null;

  const methodAction = {
    GET: 'view',
    POST: 'create',
    PUT: 'edit',
    DELETE: 'delete',
  };
  let action = methodAction[method];
  if (!action) return null;

  if (module === 'settings') {
    if (entity === 'users') action = 'manage_users';
    else if (entity === 'approvalWorkflows' || entity === 'printTemplates') action = 'edit_system';
    else if (entity === 'custom-roles' || entity === 'role-permissions') {
      // GET role-permissions: any authenticated user can read (needed for PermissionsMatrixContext)
      if (entity === 'role-permissions' && method === 'GET') return null;
      action = 'manage_roles';
    }
  }

  if (module === 'documents' && method === 'POST' && entity === 'documents') action = 'upload';

  return { module, action };
}

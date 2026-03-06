/**
 * Workflow enforcement: checks if a user can approve a transaction based on approval workflows.
 * Admins always bypass workflow checks.
 * Used by the API before allowing approve/reject actions.
 */
import { supabase } from './supabase.js';

const SENTINEL_NO_LIMIT = 999999999;

/**
 * Entity-to-workflow-type mapping for approval flows
 */
const ENTITY_TO_WORKFLOW_TYPE = {
  'purchase-orders': 'purchase_order',
  vendorInvoices: 'vendor_invoice',
  customerInvoices: 'customer_invoice',
  payments: 'payment_request',
};

/**
 * Fetches the active workflow for a given type from approval_workflows
 * @param {string} workflowType - e.g. 'purchase_order', 'vendor_invoice'
 * @returns {Promise<object|null>} workflow row or null
 */
async function getWorkflowByType(workflowType) {
  const { data, error } = await supabase
    .from('approval_workflows')
    .select('id, type, levels, auto_approval_threshold, is_active')
    .eq('type', workflowType)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

/**
 * Normalize amount threshold (handle Infinity, null, SENTINEL_NO_LIMIT)
 */
function normalizeThreshold(raw) {
  if (raw == null || raw === Infinity || raw >= SENTINEL_NO_LIMIT) return SENTINEL_NO_LIMIT;
  return Number(raw);
}

/** Get threshold from level (supports both camelCase and snake_case from DB) */
function getLevelThreshold(level) {
  const raw = level.amountThreshold ?? level.amount_threshold;
  return normalizeThreshold(raw);
}

/**
 * Determine the highest applicable level for a given amount.
 * Levels are sorted by threshold ascending. We find all levels where amount >= threshold,
 * then take the one with the largest threshold (highest level).
 * @param {Array} levels - workflow levels [{ level, amountThreshold/amount_threshold, roles, approvers }]
 * @param {number} amount
 * @returns {object|null} the highest applicable level or null
 */
function getHighestApplicableLevel(levels, amount) {
  if (!Array.isArray(levels) || levels.length === 0) return null;
  const applicable = levels.filter((l) => amount >= getLevelThreshold(l));
  if (applicable.length === 0) return null;
  return applicable.reduce((max, l) =>
    getLevelThreshold(l) > getLevelThreshold(max) ? l : max
  );
}

/**
 * Check if the user can approve based on workflow rules.
 * Admin role always bypasses (caller should check admin before calling this).
 *
 * @param {object} options
 * @param {string} options.entity - API entity e.g. 'purchase-orders', 'vendorInvoices'
 * @param {number} options.amount - transaction amount in SAR
 * @param {string} options.userId - app user id
 * @param {string} options.userRole - app_users.role (admin, project_manager, finance, employee)
 * @param {string|null} options.customRoleId - app_users.custom_role_id if any
 * @param {boolean} options.hasRbacApprove - caller has already verified RBAC approve permission
 * @returns {Promise<{ allowed: boolean, reason?: string }>}
 */
export async function canApproveByWorkflow({
  entity,
  amount,
  userId,
  userRole,
  customRoleId,
  hasRbacApprove,
}) {
  if (userRole === 'admin') {
    return { allowed: true };
  }

  const workflowType = ENTITY_TO_WORKFLOW_TYPE[entity];
  if (!workflowType) return { allowed: true };

  const workflow = await getWorkflowByType(workflowType);
  if (!workflow) return { allowed: true };
  if (workflow.is_active === false) return { allowed: true };

  const levels = workflow.levels ?? [];
  const autoThreshold = Number(workflow.auto_approval_threshold ?? 0);
  const numAmount = Number(amount) || 0;

  if (hasRbacApprove && numAmount < autoThreshold) {
    return { allowed: true };
  }

  const level = getHighestApplicableLevel(levels, numAmount);
  if (!level) return { allowed: true };

  const roles = level.roles ?? [];
  const approvers = level.approvers ?? [];

  const userRoles = [userRole];
  if (customRoleId) userRoles.push(customRoleId);

  const roleMatch = userRoles.some((r) => roles.includes(r));
  const approverMatch = approvers.includes(userId);

  if (roleMatch || approverMatch) {
    return { allowed: true };
  }

  const roleLabels = roles.map((r) => r.replace(/_/g, ' ')).join(', ');
  return {
    allowed: false,
    reason: `Workflow requires approval from one of: ${roleLabels}${approvers.length ? ' or assigned approvers' : ''}`,
  };
}

/**
 * Get workflow type for an API entity (for use by API route)
 */
export function getWorkflowTypeForEntity(entity) {
  return ENTITY_TO_WORKFLOW_TYPE[entity] || null;
}

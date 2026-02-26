/**
 * Single catch-all Vercel serverless function for all /api/* routes.
 * Uses relational Supabase tables (no KV store).
 *
 * Routes:
 *   GET    /api/health                     → public health check
 *   GET    /api/auth/me                    → current user (requires JWT)
 *   GET    /api/sequences                  → list sequences
 *   GET    /api/sequences/:type            → get one sequence
 *   POST   /api/sequences/:type/next       → consume next number
 *   PUT    /api/sequences/:type            → update sequence config
 *   GET    /api/budgetCategories           → get list
 *   PUT    /api/budgetCategories           → save list
 *   GET    /api/<entity>                   → list all
 *   POST   /api/<entity>                   → create one
 *   GET    /api/<entity>/:id               → get one
 *   PUT    /api/<entity>/:id               → update one
 *   DELETE /api/<entity>/:id               → delete one
 */
import { verifyJwt } from '../lib/verifyJwt.js';
import { supabase } from '../lib/supabase.js';
import {
  customersHandler,
  vendorsHandler,
  employeesHandler,
  projectsHandler,
  tasksHandler,
  taskGroupsHandler,
  budgetItemsHandler,
  purchaseOrdersHandler,
  variationOrdersHandler,
  vendorInvoicesHandler,
  vendorClaimsHandler,
  customerInvoicesHandler,
  paymentRequestsHandler,
  paymentsHandler,
  documentsHandler,
  printTemplatesHandler,
  usersHandler,
  projectManpowerHandler,
  manpowerMembersHandler,
  handleBudgetCategories,
  handleSequences,
} from '../lib/db.js';

// Map URL segment → handler function
const ENTITY_HANDLERS = {
  customers:        customersHandler,
  vendors:          vendorsHandler,
  employees:        employeesHandler,
  projects:         projectsHandler,
  tasks:            tasksHandler,
  taskGroups:       taskGroupsHandler,
  budgetItems:      budgetItemsHandler,
  'purchase-orders': purchaseOrdersHandler,
  variationOrders:  variationOrdersHandler,
  vendorInvoices:   vendorInvoicesHandler,
  vendorClaims:     vendorClaimsHandler,
  customerInvoices: customerInvoicesHandler,
  paymentRequests:  paymentRequestsHandler,
  payments:         paymentsHandler,
  documents:        documentsHandler,
  printTemplates:   printTemplatesHandler,
  users:            usersHandler,
  projectManpower:  projectManpowerHandler,
  manpowerMembers:  manpowerMembersHandler,
};

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // Parse the path: /api/projects/123 → ["api", "projects", "123"]
  const pathname = req.url.split('?')[0];
  const parts = pathname.split('/').filter(Boolean);
  const entity = parts[1];

  // ── Health check (public) ─────────────────────────────────────────────────
  if (entity === 'health') {
    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
    return res.status(200).json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
  }

  // ── GET /api/auth/me — current user from JWT + app_users table ────────────
  if (entity === 'auth' && parts[2] === 'me' && req.method === 'GET') {
    const payload = await verifyJwt(req);
    if (!payload) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    try {
      const { data: appUser } = await supabase
        .from('app_users')
        .select('name, role')
        .eq('id', payload.sub)
        .maybeSingle();
      const data = {
        id: payload.sub,
        email: payload.email ?? '',
        name: appUser?.name ?? payload.email ?? '',
        role: appUser?.role ?? 'user',
      };
      return res.status(200).json({ success: true, data });
    } catch (e) {
      console.error('[auth/me] error:', e);
      return res.status(500).json({ success: false, error: e.message || 'Internal server error' });
    }
  }

  // ── All other routes require valid JWT ────────────────────────────────────
  const payload = await verifyJwt(req);
  if (!payload) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  // ── Number sequences ──────────────────────────────────────────────────────
  if (entity === 'sequences') {
    return handleSequences(req, res);
  }

  // ── Budget categories (single-array config) ───────────────────────────────
  if (entity === 'budgetCategories') {
    return handleBudgetCategories(req, res);
  }

  // ── Entity routes ─────────────────────────────────────────────────────────
  const entityHandler = ENTITY_HANDLERS[entity];
  if (!entityHandler) {
    return res.status(404).json({ success: false, error: `Unknown route: /api/${entity}` });
  }

  return entityHandler(req, res);
}

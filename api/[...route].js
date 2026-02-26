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

  // ── POST /api/auth/invite — invite a new user (admin only) ──────────────
  if (entity === 'auth' && parts[2] === 'invite' && req.method === 'POST') {
    const payload = await verifyJwt(req);
    if (!payload) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    // Only admins can invite users
    const { data: callerRow } = await supabase
      .from('app_users')
      .select('role')
      .eq('id', payload.sub)
      .maybeSingle();
    if (callerRow?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden: admin only' });
    }

    const { email, name, role } = req.body || {};
    if (!email || !name) {
      return res.status(400).json({ success: false, error: 'email and name are required' });
    }

    try {
      // Create the auth user and send the invitation email via Supabase
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: { name },
      });
      if (inviteError) {
        return res.status(400).json({ success: false, error: inviteError.message });
      }

      const authUserId = inviteData.user.id;

      // Insert into app_users with the UUID from auth
      const { data: appUser, error: insertError } = await supabase
        .from('app_users')
        .insert({
          id: authUserId,
          name,
          email,
          role: role === 'admin' ? 'admin' : 'user',
          status: 'active',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        // Auth user was created but app_users insert failed — non-fatal, still return success
        console.error('[auth/invite] app_users insert error:', insertError.message);
        return res.status(200).json({ success: true, data: { id: authUserId, email, name, role: role ?? 'user', status: 'active' } });
      }

      return res.status(200).json({ success: true, data: appUser });
    } catch (e) {
      console.error('[auth/invite] error:', e);
      return res.status(500).json({ success: false, error: e.message || 'Internal server error' });
    }
  }

  // ── PUT /api/auth/manage-user/:id — update user role/status (admin only) ──
  if (entity === 'auth' && parts[2] === 'manage-user' && parts[3] && req.method === 'PUT') {
    const payload = await verifyJwt(req);
    if (!payload) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const { data: callerRow } = await supabase
      .from('app_users')
      .select('role')
      .eq('id', payload.sub)
      .maybeSingle();
    if (callerRow?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden: admin only' });
    }

    const targetId = parts[3];
    // Prevent admin from demoting/deactivating themselves
    if (targetId === payload.sub) {
      return res.status(400).json({ success: false, error: 'You cannot modify your own account' });
    }

    const { role, status } = req.body || {};
    const update = {};
    if (role === 'admin' || role === 'user') update.role = role;
    if (status === 'active' || status === 'inactive') update.status = status;
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    try {
      const { data: updatedUser, error: updateError } = await supabase
        .from('app_users')
        .update(update)
        .eq('id', targetId)
        .select()
        .single();
      if (updateError) {
        return res.status(400).json({ success: false, error: updateError.message });
      }

      // If deactivating, ban the user in Supabase Auth so they can't log in
      if (update.status === 'inactive') {
        await supabase.auth.admin.updateUserById(targetId, { ban_duration: '876000h' });
      }
      // If reactivating, unban
      if (update.status === 'active') {
        await supabase.auth.admin.updateUserById(targetId, { ban_duration: 'none' });
      }

      return res.status(200).json({ success: true, data: updatedUser });
    } catch (e) {
      console.error('[auth/manage-user] error:', e);
      return res.status(500).json({ success: false, error: e.message || 'Internal server error' });
    }
  }

  // ── DELETE /api/auth/manage-user/:id — delete user (admin only) ───────────
  if (entity === 'auth' && parts[2] === 'manage-user' && parts[3] && req.method === 'DELETE') {
    const payload = await verifyJwt(req);
    if (!payload) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const { data: callerRow } = await supabase
      .from('app_users')
      .select('role')
      .eq('id', payload.sub)
      .maybeSingle();
    if (callerRow?.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Forbidden: admin only' });
    }

    const targetId = parts[3];
    if (targetId === payload.sub) {
      return res.status(400).json({ success: false, error: 'You cannot delete your own account' });
    }

    try {
      // Delete from app_users first
      await supabase.from('app_users').delete().eq('id', targetId);
      // Delete from Supabase Auth
      await supabase.auth.admin.deleteUser(targetId);
      return res.status(200).json({ success: true, data: null });
    } catch (e) {
      console.error('[auth/manage-user DELETE] error:', e);
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

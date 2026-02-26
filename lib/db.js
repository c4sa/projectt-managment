/**
 * Relational database layer — replaces lib/kv.js + lib/handlers.js.
 * All queries run against the Supabase relational schema using the service-role key.
 *
 * Each entity has: list(), getOne(id), create(body), update(id, body), remove(id)
 * Budget categories use: getCategories(), saveCategories(arr)
 * Number sequences use: nextNumber(type)
 */
import { supabase } from './supabase.js';

// ─── helpers ────────────────────────────────────────────────────────────────

function ok(res, data) {
  return res.status(200).json({ success: true, data });
}
function fail(res, status, message) {
  return res.status(status).json({ success: false, error: message });
}

async function dbHandler(res, fn) {
  try {
    return await fn();
  } catch (e) {
    console.error('[db] error:', e);
    return fail(res, 500, e.message || 'Internal server error');
  }
}

// ─── number sequences ────────────────────────────────────────────────────────

/**
 * Atomically increments the counter for `entity` and returns the consumed value.
 * The DB table has columns: entity (text), current (int).
 * Number formatting (prefix, year, padding) is handled on the frontend.
 */
export async function nextCounter(entity) {
  const { data: row, error: fetchErr } = await supabase
    .from('number_sequences')
    .select('current')
    .eq('entity', entity)
    .maybeSingle();
  if (fetchErr) throw fetchErr;

  if (!row) {
    // Insert with starting value of 1
    const { error: insErr } = await supabase
      .from('number_sequences')
      .insert({ entity, current: 2 });
    if (insErr) throw insErr;
    return 1;
  }

  const current = row.current;
  const { error: updateErr } = await supabase
    .from('number_sequences')
    .update({ current: current + 1 })
    .eq('entity', entity);
  if (updateErr) throw updateErr;

  return current;
}

// ─── generic CRUD handler builder ────────────────────────────────────────────

import { randomUUID } from 'crypto';

/**
 * Creates a request handler for a Supabase table.
 * The DB tables have id NOT NULL (no default), so we generate a UUID on insert.
 */
function makeTableHandler({ table, select = '*', toDb, fromDb, queryFilter, orderBy = 'created_at', orderAsc = false }) {
  const toRow = toDb || ((b) => b);
  const fromRow = fromDb || ((r) => r);

  return async function handler(req, res) {
    const urlParts = req.url.split('?')[0].split('/').filter(Boolean);
    const id = urlParts.length >= 3 ? urlParts[urlParts.length - 1] : null;

    return dbHandler(res, async () => {
      // LIST
      if (req.method === 'GET' && !id) {
        let query = supabase.from(table).select(select).order(orderBy, { ascending: orderAsc });
        if (queryFilter) query = queryFilter(query, req);
        const { data, error } = await query;
        if (error) throw error;
        return ok(res, (data ?? []).map(fromRow));
      }

      // GET ONE
      if (req.method === 'GET' && id) {
        const { data, error } = await supabase.from(table).select(select).eq('id', id).maybeSingle();
        if (error) throw error;
        if (!data) return fail(res, 404, 'Not found');
        return ok(res, fromRow(data));
      }

      // CREATE
      if (req.method === 'POST') {
        const body = req.body;
        if (!body) return fail(res, 400, 'Request body is required');

        const row = nullifyEmptyFKs(toRow(body));
        // Always generate a fresh UUID — DB has no default
        row.id = randomUUID();

        const { data, error } = await supabase.from(table).insert(row).select(select).single();
        if (error) throw error;
        return ok(res, fromRow(data));
      }

      // UPDATE
      if (req.method === 'PUT' && id) {
        const body = req.body;
        const row = nullifyEmptyFKs(toRow(body));
        // Never allow id to be changed
        delete row.id;
        const { data, error } = await supabase.from(table).update(row).eq('id', id).select(select).single();
        if (error) throw error;
        if (!data) return fail(res, 404, 'Not found');
        return ok(res, fromRow(data));
      }

      // DELETE
      if (req.method === 'DELETE' && id) {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
        return ok(res, null);
      }

      return fail(res, 405, 'Method not allowed');
    });
  };
}

// ─── field name mapping helpers ──────────────────────────────────────────────
// The frontend uses camelCase; the DB uses snake_case.
// Simple conversion for common patterns.

function camelToSnake(str) {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/** Convert all keys of an object from camelCase to snake_case */
function toSnake(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[camelToSnake(k)] = v;
  }
  return out;
}

/** Convert all keys of an object from snake_case to camelCase */
function toCamel(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[snakeToCamel(k)] = v;
  }
  return out;
}

/**
 * Convert empty-string FK columns to null.
 * Any column ending with _id that has an empty string value would violate FK constraints.
 * Also converts empty strings for other nullable columns to null.
 */
function nullifyEmptyFKs(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    // FK columns: empty string → null
    if (k.endsWith('_id') && v === '') {
      out[k] = null;
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Pick only known DB columns from a snake_case object.
 * Strips any extra frontend-only fields before sending to Supabase.
 */
function pick(obj, cols) {
  const out = {};
  for (const col of cols) {
    if (col in obj) out[col] = obj[col];
  }
  return out;
}

// ─── per-table column lists (actual DB column names, snake_case) ─────────────
// Derived from probing the real Supabase tables.

const COLS = {
  projects: ['id','name','code','status','customer_id','project_manager','assistant_pm','team_members','start_date','end_date','description','location','budget','spent','contract_value','vat_status','contract_document','contract_link','created_at'],
  customers: ['id','code','name','email','phone','vat_number','contact_person','address','created_at'],
  vendors: ['id','code','name','email','phone','bank_name','iban','vat_number','specialty','address','contact_person','created_at'],
  employees: ['id','employee_id','name','email','phone','nationality','id_number','passport_number','department','position','assigned_role','joining_date','bank_name','iban','emergency_contact','emergency_phone','address','notes','status','user_id','created_at','updated_at'],
  tasks: ['id','project_id','title','description','status','priority','custom_fields','group_id','due_date','assignees','dependencies','comments','created_at','updated_at'],
  task_groups: ['id','project_id','name','color','order'],
  budget_items: ['id','project_id','category','name','budgeted','reserved','actual','created_at'],
  purchase_orders: ['id','po_number','vendor_id','project_id','status','issue_date','delivery_date','items','subtotal','vat_rate','vat_amount','total','budget_category','notes','created_at','created_by','modified_at','modified_by','approved_by','approved_date','rejected_by','rejected_date','rejection_reason','modification_requested_by','modification_requested_date','modification_request_reason'],
  variation_orders: ['id','vo_number','po_id','project_id','original_amount','variation_amount','total_amount','status','description','approval_date','rejection_reason','budget_category','created_at'],
  vendor_invoices: ['id','invoice_number','vendor_id','project_id','po_id','status','issue_date','invoice_date','due_date','payment_date','description','items','subtotal','vat_rate','vat_amount','vat_treatment','vat','budget_category','notes','created_at','created_by','attachment_count','approved_by','approved_date','rejected_by','rejected_date','rejection_reason','sent_for_approval_by','sent_for_approval_date','modification_requested_by','modification_requested_date','modification_request_reason'],
  vendor_claims: ['id','claim_number','vendor_id','project_id','po_id','status','submitted_date','approved_date','items','variation_orders','retention_rate','retention_amount','vat_inclusive','subtotal','vat_amount','total','rejection_reason','created_at'],
  customer_invoices: ['id','invoice_number','customer_id','project_id','status','issue_date','due_date','payment_date','items','subtotal','vat_rate','vat_amount','total','amount_paid','notes','created_at'],
  payment_requests: ['id','request_number','type','linked_id','amount','status','requested_by','request_date','level1_approved_by','level1_approved_date','fully_approved_by','fully_approved_date','rejection_reason','notes','created_at'],
  payments: ['id','payment_number','type','customer_id','vendor_id','project_id','invoice_id','po_id','amount','subtotal','vat','payment_method','payment_date','reference_number','notes','created_at','status','line_item_payments','created_by','created_by_name','approved_by','approved_by_name','approved_date','rejected_by','rejected_by_name','rejected_date','rejection_reason','paid_by','paid_by_name','paid_date'],
  documents: ['id','project_id','name','type','file_url','file_size','uploaded_by','uploaded_at'],
  print_templates: ['id','name','type','logo_url','header_color','font_family','header','footer','margin_top','margin_bottom','margin_left','margin_right','is_default','created_at'],
  project_manpower: ['id','project_id','site_engineers','foremen','technicians_electrical','technicians_plumbing','technicians_hvac','helpers_laborers','safety_officers','qa_qc','project_manager','assistant_pm','notes','created_at','updated_at'],
  manpower_members: ['id','project_id','name','role','employee_id','phone','email','nationality','id_number','joining_date','created_at','notes'],
  app_users: ['id','name','email','role','status','created_at'],
};

/** Convert camelCase body → snake_case, then pick only known DB columns */
function toDb(table) {
  return (body) => pick(toSnake(body), COLS[table]);
}

// ─── entity handlers ─────────────────────────────────────────────────────────

// customers
export const customersHandler = makeTableHandler({
  table: 'customers',
  toDb: toDb('customers'),
  fromDb: toCamel,
});

// vendors
export const vendorsHandler = makeTableHandler({
  table: 'vendors',
  toDb: toDb('vendors'),
  fromDb: toCamel,
});

// employees
export const employeesHandler = makeTableHandler({
  table: 'employees',
  toDb: toDb('employees'),
  fromDb: toCamel,
});

// projects
export const projectsHandler = makeTableHandler({
  table: 'projects',
  toDb: toDb('projects'),
  fromDb: toCamel,
});

// tasks — support optional ?projectId= filter
export const tasksHandler = makeTableHandler({
  table: 'tasks',
  toDb: toDb('tasks'),
  fromDb: toCamel,
  queryFilter: (q, req) => {
    const projectId = new URL(`http://x${req.url}`).searchParams.get('projectId');
    return projectId ? q.eq('project_id', projectId) : q;
  },
});

// task groups — support optional ?projectId= filter
export const taskGroupsHandler = makeTableHandler({
  table: 'task_groups',
  toDb: toDb('task_groups'),
  fromDb: toCamel,
  orderBy: 'order',
  orderAsc: true,
  queryFilter: (q, req) => {
    const projectId = new URL(`http://x${req.url}`).searchParams.get('projectId');
    return projectId ? q.eq('project_id', projectId) : q;
  },
});

// budget items — support optional ?projectId= filter
export const budgetItemsHandler = makeTableHandler({
  table: 'budget_items',
  toDb: toDb('budget_items'),
  fromDb: toCamel,
  queryFilter: (q, req) => {
    const projectId = new URL(`http://x${req.url}`).searchParams.get('projectId');
    return projectId ? q.eq('project_id', projectId) : q;
  },
});

// purchase orders
export const purchaseOrdersHandler = makeTableHandler({
  table: 'purchase_orders',
  toDb: toDb('purchase_orders'),
  fromDb: toCamel,
});

// variation orders
export const variationOrdersHandler = makeTableHandler({
  table: 'variation_orders',
  toDb: toDb('variation_orders'),
  fromDb: toCamel,
});

// vendor invoices
export const vendorInvoicesHandler = makeTableHandler({
  table: 'vendor_invoices',
  toDb: toDb('vendor_invoices'),
  fromDb: toCamel,
});

// vendor claims
export const vendorClaimsHandler = makeTableHandler({
  table: 'vendor_claims',
  toDb: toDb('vendor_claims'),
  fromDb: toCamel,
});

// customer invoices
export const customerInvoicesHandler = makeTableHandler({
  table: 'customer_invoices',
  toDb: toDb('customer_invoices'),
  fromDb: toCamel,
});

// payment requests
export const paymentRequestsHandler = makeTableHandler({
  table: 'payment_requests',
  toDb: toDb('payment_requests'),
  fromDb: toCamel,
});

// payments
export const paymentsHandler = makeTableHandler({
  table: 'payments',
  toDb: toDb('payments'),
  fromDb: toCamel,
});

// documents — ordered by upload time
export const documentsHandler = makeTableHandler({
  table: 'documents',
  toDb: toDb('documents'),
  fromDb: toCamel,
  orderBy: 'uploaded_at',
  orderAsc: false,
  queryFilter: (q, req) => {
    const projectId = new URL(`http://x${req.url}`).searchParams.get('projectId');
    return projectId ? q.eq('project_id', projectId) : q;
  },
});

// print templates
export const printTemplatesHandler = makeTableHandler({
  table: 'print_templates',
  toDb: toDb('print_templates'),
  fromDb: toCamel,
});

// system users (app_users table)
export const usersHandler = makeTableHandler({
  table: 'app_users',
  toDb: toDb('app_users'),
  fromDb: toCamel,
});

// project manpower
export const projectManpowerHandler = makeTableHandler({
  table: 'project_manpower',
  toDb: toDb('project_manpower'),
  fromDb: toCamel,
  queryFilter: (q, req) => {
    const projectId = new URL(`http://x${req.url}`).searchParams.get('projectId');
    return projectId ? q.eq('project_id', projectId) : q;
  },
});

// manpower members
export const manpowerMembersHandler = makeTableHandler({
  table: 'manpower_members',
  toDb: toDb('manpower_members'),
  fromDb: toCamel,
  queryFilter: (q, req) => {
    const projectId = new URL(`http://x${req.url}`).searchParams.get('projectId');
    return projectId ? q.eq('project_id', projectId) : q;
  },
});

// ─── budget categories (special case — stored as rows with id+name) ──────────

const DEFAULT_CATEGORIES = [
  'Fitout', 'Construction', 'Electrical', 'Plumbing', 'HVAC',
  'IT/Low-Current', 'Furniture (FF&E)', 'Landscaping', 'Manpower', 'Other',
];

export async function handleBudgetCategories(req, res) {
  return dbHandler(res, async () => {
    if (req.method === 'GET') {
      // Table has: id (serial/int), name (text)
      const { data, error } = await supabase
        .from('budget_categories')
        .select('name')
        .order('id', { ascending: true });
      if (error) throw error;
      const categories = data && data.length > 0
        ? data.map((r) => r.name)
        : DEFAULT_CATEGORIES;
      return ok(res, categories);
    }

    if (req.method === 'PUT') {
      const { categories } = req.body;
      if (!Array.isArray(categories)) {
        return fail(res, 400, 'categories must be an array');
      }
      // Delete all existing rows, then insert the new list
      const { error: delErr } = await supabase
        .from('budget_categories')
        .delete()
        .neq('name', '__placeholder_that_never_matches__');
      if (delErr) throw delErr;

      if (categories.length > 0) {
        const rows = categories.map((name) => ({ name }));
        const { error: insErr } = await supabase.from('budget_categories').insert(rows);
        if (insErr) throw insErr;
      }
      return ok(res, categories);
    }

    return fail(res, 405, 'Method not allowed');
  });
}

// ─── number sequences API ─────────────────────────────────────────────────────
// DB table has: entity (text PK), current (int).
// The frontend holds all formatting config (prefix, year, padding etc.).
// POST /api/sequences/:entity/next  → increments counter, returns { current }
// GET  /api/sequences/:entity       → returns { entity, current } without consuming
// GET  /api/sequences               → all rows

export async function handleSequences(req, res) {
  return dbHandler(res, async () => {
    const urlParts = req.url.split('?')[0].split('/').filter(Boolean);
    // urlParts: ["api", "sequences"] or ["api", "sequences", ":entity"] or ["api", "sequences", ":entity", "next"]
    const entity = urlParts.length >= 3 ? urlParts[2] : null;
    const isNext = urlParts[3] === 'next';

    // POST /api/sequences/:entity/next — atomically consume next counter value
    if (req.method === 'POST' && entity && isNext) {
      const current = await nextCounter(entity);
      return ok(res, { current });
    }

    // GET /api/sequences/:entity — preview current counter without consuming
    if (req.method === 'GET' && entity) {
      const { data, error } = await supabase
        .from('number_sequences')
        .select('entity, current')
        .eq('entity', entity)
        .maybeSingle();
      if (error) throw error;
      if (!data) return fail(res, 404, 'Sequence not found');
      return ok(res, data);
    }

    // GET /api/sequences — list all
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('number_sequences')
        .select('entity, current')
        .order('entity');
      if (error) throw error;
      return ok(res, data ?? []);
    }

    // PUT /api/sequences/:entity — update the current counter directly
    if (req.method === 'PUT' && entity) {
      const { current } = req.body;
      if (typeof current !== 'number') return fail(res, 400, 'current must be a number');
      const { data, error } = await supabase
        .from('number_sequences')
        .update({ current })
        .eq('entity', entity)
        .select('entity, current')
        .single();
      if (error) throw error;
      return ok(res, data);
    }

    return fail(res, 405, 'Method not allowed');
  });
}

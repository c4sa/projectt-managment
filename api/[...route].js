/**
 * Single catch-all Vercel serverless function for all /api/* routes.
 * Consolidates all 21 entity handlers into 1 function to stay within
 * the Hobby plan's 12-function limit.
 *
 * Routes:
 *   GET    /api/health
 *   GET    /api/<entity>           → list all
 *   POST   /api/<entity>           → create one
 *   GET    /api/<entity>/:id       → get one
 *   PUT    /api/<entity>/:id       → update one (merge)
 *   DELETE /api/<entity>/:id       → delete one
 *   GET    /api/budgetCategories   → get list (or defaults)
 *   PUT    /api/budgetCategories   → save list
 */
import { kv } from '../lib/kv.js';
import { makeHandler } from '../lib/handlers.js';

// Map URL segment → KV prefix
const ENTITY_ROUTES = {
  projects:         'project:',
  customers:        'customer:',
  vendors:          'vendor:',
  users:            'user:',
  employees:        'employee:',
  'purchase-orders':'po:',
  tasks:            'task:',
  taskGroups:       'taskGroup:',
  budgetItems:      'budgetItem:',
  variationOrders:  'variationOrder:',
  vendorInvoices:   'vendorInvoice:',
  vendorClaims:     'vendorClaim:',
  customerInvoices: 'customerInvoice:',
  paymentRequests:  'paymentRequest:',
  payments:         'payment:',
  projectManpower:  'projectManpower:',
  manpowerMembers:  'manpowerMember:',
  printTemplates:   'template:',
  documents:        'document:',
};

const BUDGET_CATEGORIES_KEY = 'budgetCategories:all';
const DEFAULT_CATEGORIES = [
  'Fitout', 'Construction', 'Electrical', 'Plumbing', 'HVAC',
  'IT/Low-Current', 'Furniture (FF&E)', 'Landscaping', 'Manpower', 'Other',
];

// Pre-build handler instances for each entity
const entityHandlers = {};
for (const [route, prefix] of Object.entries(ENTITY_ROUTES)) {
  entityHandlers[route] = makeHandler(prefix);
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  // Parse the path: /api/projects/123 → ["projects", "123"]
  const pathname = req.url.split('?')[0];
  const parts = pathname.split('/').filter(Boolean);
  // parts[0] === "api", parts[1] === entity, parts[2] === optional id
  const entity = parts[1];

  // Health check
  if (entity === 'health') {
    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
    return res.status(200).json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
  }

  // Budget categories (special case — stored as a single array, not individual records)
  if (entity === 'budgetCategories') {
    try {
      if (req.method === 'GET') {
        let categories = await kv.get(BUDGET_CATEGORIES_KEY);
        if (!categories) {
          categories = DEFAULT_CATEGORIES;
          await kv.set(BUDGET_CATEGORIES_KEY, categories);
        }
        return res.status(200).json({ success: true, data: categories });
      }
      if (req.method === 'PUT') {
        const { categories } = req.body;
        if (!Array.isArray(categories)) {
          return res.status(400).json({ success: false, error: 'categories must be an array' });
        }
        await kv.set(BUDGET_CATEGORIES_KEY, categories);
        return res.status(200).json({ success: true, data: categories });
      }
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    } catch (e) {
      console.error('[budgetCategories] error:', e);
      return res.status(500).json({ success: false, error: e.message || 'Internal server error' });
    }
  }

  // Entity routes
  const entityHandler = entityHandlers[entity];
  if (!entityHandler) {
    return res.status(404).json({ success: false, error: `Unknown route: /api/${entity}` });
  }

  return entityHandler(req, res);
}

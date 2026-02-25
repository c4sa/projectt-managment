import { kv } from '../lib/kv.js';

const KEY = 'budgetCategories:all';

const DEFAULT_CATEGORIES = [
  'Fitout', 'Construction', 'Electrical', 'Plumbing', 'HVAC',
  'IT/Low-Current', 'Furniture (FF&E)', 'Landscaping', 'Manpower', 'Other',
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      let categories = await kv.get(KEY);
      if (!categories) {
        categories = DEFAULT_CATEGORIES;
        await kv.set(KEY, categories);
      }
      return res.status(200).json({ success: true, data: categories });
    }

    if (req.method === 'PUT') {
      const { categories } = req.body;
      if (!Array.isArray(categories)) {
        return res.status(400).json({ success: false, error: 'categories must be an array' });
      }
      await kv.set(KEY, categories);
      return res.status(200).json({ success: true, data: categories });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e) {
    console.error('[budgetCategories] handler error:', e);
    return res.status(500).json({ success: false, error: e.message || 'Internal server error' });
  }
}

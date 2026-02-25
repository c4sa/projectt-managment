/**
 * Shared handler factory for all entity CRUD operations.
 * Each entity maps to a KV prefix (e.g. "project:", "customer:").
 *
 * Standard response shape: { success: true, data: ... } or { success: false, error: "..." }
 */
import { kv } from './kv.js';

function ok(res, data) {
  return res.status(200).json({ success: true, data });
}

function err(res, status, message) {
  return res.status(status).json({ success: false, error: message });
}

/**
 * Creates a fully-featured CRUD handler for a given KV prefix.
 *
 * Routes handled (Express-style):
 *   GET    /api/<entity>s         → list all
 *   POST   /api/<entity>s         → create one
 *   GET    /api/<entity>s/:id     → get one
 *   PUT    /api/<entity>s/:id     → update one (merge)
 *   DELETE /api/<entity>s/:id     → delete one
 *
 * On Vercel, we receive the full req.url and must parse the id ourselves.
 */
export function makeHandler(prefix) {
  return async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') return res.status(204).end();

    try {
      // Parse id from URL: /api/projects/123 → "123"
      const urlParts = req.url.split('?')[0].split('/').filter(Boolean);
      // urlParts example: ["api", "projects", "123"]
      const id = urlParts.length >= 3 ? urlParts[urlParts.length - 1] : null;

      if (req.method === 'GET' && !id) {
        // List all
        const items = await kv.getByPrefix(prefix);
        return ok(res, items);
      }

      if (req.method === 'GET' && id) {
        // Get one
        const item = await kv.get(`${prefix}${id}`);
        if (!item) return err(res, 404, 'Not found');
        return ok(res, item);
      }

      if (req.method === 'POST') {
        // Create one — body must contain the full object with its id
        const body = req.body;
        if (!body || !body.id) return err(res, 400, 'Body must include an id field');
        await kv.set(`${prefix}${body.id}`, body);
        return ok(res, body);
      }

      if (req.method === 'PUT' && id) {
        // Update one — merge existing with updates
        const existing = await kv.get(`${prefix}${id}`);
        if (!existing) return err(res, 404, 'Not found');
        const updated = { ...existing, ...req.body };
        await kv.set(`${prefix}${id}`, updated);
        return ok(res, updated);
      }

      if (req.method === 'DELETE' && id) {
        await kv.del(`${prefix}${id}`);
        return ok(res, null);
      }

      return err(res, 405, 'Method not allowed');
    } catch (e) {
      console.error(`[${prefix}] handler error:`, e);
      return err(res, 500, e.message || 'Internal server error');
    }
  };
}

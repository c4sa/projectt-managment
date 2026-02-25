# Core Code — API Architecture Implementation Guide

This document describes how to implement **Supabase-backed storage** with an **Express server for local development** and **Vercel serverless functions for production**. The pattern is based on the registraion-demo project so the team can run one process locally and deploy the same API surface on Vercel.

---

## 1. Target Architecture Overview

### 1.1 Current State

| Layer | Current | Notes |
|-------|---------|--------|
| **Frontend** | Vite (React) | Calls `https://<projectId>.supabase.co/functions/v1/make-server-02fd4b7a` |
| **Backend** | Supabase Edge Function (Deno + Hono) | Not running locally → all API calls 404 → fallback to localStorage |
| **Storage** | localStorage (browser) | Data in `core_code_data`; company/profile in separate keys |
| **File storage** | Supabase Storage (in Edge Function) | Only works when Edge Function is deployed |

### 1.2 Target State

| Environment | API runtime | Storage |
|-------------|-------------|---------|
| **Local** | Express server (Node), one process, one port (e.g. 3000) | Supabase (Postgres + Storage) |
| **Vercel (production)** | Vercel serverless functions under `/api/*` | Supabase (Postgres + Storage) |

- **Single API surface:** Same paths and request/response shapes in both environments (e.g. `GET /api/projects`, `POST /api/projects`).
- **Supabase only:** All persistent data and files go through Supabase (database + Storage). No dependency on the old Edge Function for Core Code.

---

## 2. High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Vite / React)                        │
│  store.ts → apiCall(API_BASE + '/api/...')                               │
│  API_BASE = dev ? 'http://localhost:3000' : '' (same origin on Vercel)  │
└─────────────────────────────────────────────────────────────────────────┘
                    │                                    │
                    │ Local                              │ Vercel
                    ▼                                    ▼
┌──────────────────────────────┐    ┌─────────────────────────────────────┐
│  Express (server.js)         │    │  Vercel Serverless                   │
│  app.listen(3000)             │    │  api/projects.js, api/customers.js,   │
│  Routes: /api/projects,       │    │  api/vendors.js, ...                 │
│  /api/customers, ...          │    │  Same routes: /api/projects, etc.    │
└──────────────────────────────┘    └─────────────────────────────────────┘
                    │                                    │
                    └────────────────┬───────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────────┐
                    │  Supabase                            │
                    │  • Postgres (KV store or tables)      │
                    │  • Storage (documents, logos, etc.)   │
                    │  • Auth (optional, later)            │
                    └─────────────────────────────────────┘
```

---

## 3. Supabase Setup

### 3.1 Database

The existing Edge Function uses a **key-value table** `kv_store_02fd4b7a` (key TEXT, value JSONB). You can either:

- **Option A — Keep KV store:** Use the same table from the new Node API (Express + Vercel). Implement a small KV helper that uses Supabase JS client to `getByPrefix`, `get`, `set`, `del` (see `supabase/functions/server/kv_store.tsx` for the key patterns: `project:`, `customer:`, `vendor:`, `po:`, `vendorInvoice:`, `customerInvoice:`, `payment:`, etc.).
- **Option B — Move to tables:** Create proper tables (projects, customers, vendors, purchase_orders, vendor_invoices, customer_invoices, payments, users, employees, etc.) and use Supabase client `.from('projects')` etc. This is better long-term but requires a migration from the current localStorage/KV shape.

For a minimal-change implementation, **Option A** (KV table) is enough: one table, same key naming as today.

### 3.2 Storage

- Use one Supabase Storage bucket (e.g. `make-02fd4b7a-documents` or a new one) for:
  - Project documents / contract files
  - Company logo
  - Profile photos
- Upload via your API (Express or Vercel) using the Supabase JS client and **service role** key; return signed URLs or public URLs to the frontend.

### 3.3 Environment Variables

Used by both Express and Vercel serverless:

| Variable | Description | Where |
|----------|-------------|--------|
| `VITE_SUPABASE_URL` | Supabase project URL | .env, Vercel env |
| `VITE_SUPABASE_ANON_KEY` | Anon key (if frontend calls Supabase directly for something) | .env, Vercel env |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (backend only, never expose to frontend) | .env, Vercel env (do not prefix with VITE_) |

For **local** Express, you can reuse the same names and load them with `dotenv` from `.env`. For **Vercel**, set the same variables in Project Settings → Environment Variables.

---

## 4. Local Development — Express Server

### 4.1 Role

- One Node process (Express) listening on a port (e.g. 3000).
- Serves **all** API routes under `/api/` (e.g. `/api/projects`, `/api/customers`, `/api/vendorInvoices`, `/api/documents/upload`).
- Uses Supabase JS client (with service role) for DB and Storage; no localStorage.

### 4.2 Suggested Structure

```
Core_Code/
├── server.js                 # Express app: CORS, json(), route registration
├── api/                      # Shared handlers (optional — see 4.4)
│   ├── projects.js           # GET/POST /api/projects, GET/PUT/DELETE /api/projects/:id
│   ├── customers.js
│   ├── vendors.js
│   ├── purchase-orders.js
│   ├── vendor-invoices.js
│   ├── customer-invoices.js
│   ├── payments.js
│   ├── users.js
│   ├── employees.js
│   ├── documents.js          # upload, delete, refresh-url
│   ├── health.js
│   └── ...
├── lib/
│   └── supabase.js           # createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
│   └── kv.js                 # get, set, del, getByPrefix using Supabase table
├── src/                      # Existing frontend
├── package.json
└── vercel.json
```

### 4.3 Express App (server.js) — Outline

- `express()`, `cors()`, `express.json()`.
- Load env with `dotenv.config()`.
- Create Supabase client (from `lib/supabase.js`) using `process.env.VITE_SUPABASE_URL` and `process.env.SUPABASE_SERVICE_ROLE_KEY`.
- Register routes. Two options:
  - **Inline:** Define each route in `server.js` (like registraion-demo for most routes).
  - **Delegate:** Mount or forward to handlers in `api/*.js` so the same handler can be used by Vercel (see Section 5).
- Response shape: `{ success: true, data: ... }` or `{ success: false, error: "..." }` so the existing frontend `apiCall` logic stays valid.
- End with `app.listen(PORT, () => { ... })` so that when you run `node server.js`, the server runs only in “local” mode (no export for Vercel in this file).

### 4.4 API Paths to Implement (Match Existing store.ts + Edge Function)

Ensure these paths and methods exist so the frontend can switch to `API_BASE + '/api/...'`:

| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/health | Health check |
| GET | /api/projects | List projects |
| GET | /api/projects/:id | Get one project |
| POST | /api/projects | Create project |
| PUT | /api/projects/:id | Update project |
| DELETE | /api/projects/:id | Delete project |
| GET/POST/PUT/DELETE | /api/customers, /api/customers/:id | Customers CRUD |
| GET/POST/PUT/DELETE | /api/vendors, /api/vendors/:id | Vendors CRUD |
| GET/POST/PUT/DELETE | /api/users, /api/users/:id | Users CRUD |
| GET/POST/PUT/DELETE | /api/employees, /api/employees/:id | Employees CRUD |
| GET/POST/PUT/DELETE | /api/purchase-orders, /api/purchase-orders/:id | POs CRUD |
| GET/POST/PUT/DELETE | /api/vendorInvoices, /api/vendorInvoices/:id | Vendor invoices CRUD |
| GET/POST/PUT/DELETE | /api/customerInvoices, /api/customerInvoices/:id | Customer invoices CRUD |
| GET/POST/PUT/DELETE | /api/payments, /api/payments/:id | Payments CRUD |
| GET/POST | /api/print-templates, /api/print-templates/:id | Print templates |
| POST | /api/documents/upload | Upload file (multipart) → Supabase Storage + metadata in KV/table |
| DELETE | /api/documents/:id | Delete document |
| POST | /api/documents/:id/refresh-url | Refresh signed URL |
| GET/POST/PUT/DELETE | /api/folders, /api/folders/:id | Folders (if used) |
| GET | /api/document-activities | Document activities (if used) |

Plus any other entities the store or app use (e.g. tasks, taskGroups, budgetItems, variationOrders, vendorClaims, paymentRequests) with the same CRUD pattern. The existing Edge Function and `store.ts` are the source of truth for the list.

### 4.5 NPM Scripts (package.json)

Add or adjust:

```json
{
  "scripts": {
    "dev": "vite",
    "dev:server": "node server.js",
    "dev:full": "concurrently \"npm run dev:server\" \"npm run dev\""
  }
}
```

- **dev** — Frontend only (Vite). Point it at the Express server URL via env (see Section 6).
- **dev:server** — Backend only (Express on e.g. port 3000).
- **dev:full** — Both; use this for “full stack” local development. Install `concurrently` if needed.

---

## 5. Production — Vercel Serverless

### 5.1 Role

- No long-running Express process. Each request to `/api/*` is handled by a **Vercel serverless function**.
- Same Supabase client and env vars as local; same response shapes.

### 5.2 vercel.json

- SPA: send all non-API requests to `index.html`.
- Leave `/api/*` **unrewritten** so Vercel invokes the functions in `api/`.

Example:

```json
{
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ],
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install"
}
```

So: `https://your-app.vercel.app/api/projects` → serverless function; `https://your-app.vercel.app/dashboard` → `index.html`.

### 5.3 Serverless Function Layout

In Vercel, a file at `api/<name>.js` (or `api/<name>/index.js`) becomes the handler for `/api/<name>`. For **dynamic routes** (e.g. `/api/projects/:id`), use either:

- `api/projects/[id].js` for GET/PUT/DELETE one project, and `api/projects/index.js` for GET list / POST create, or
- A single `api/projects.js` that does not work as a catch-all on Vercel; so split by method/path as needed.

**Recommended:** One file per resource (or per logical group), exporting a default function:

```js
// api/projects.js (simplified)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'GET' && !req.url.includes('/api/projects/')) {
    // list
  } else if (req.method === 'GET') {
    // get by id (parse id from req.url or use api/projects/[id].js)
  } else if (req.method === 'POST') { ... }
  else if (req.method === 'PUT') { ... }
  else if (req.method === 'DELETE') { ... }
  else res.status(405).end();
}
```

Or split: `api/projects/index.js` (list + create), `api/projects/[id].js` (get, update, delete). Use the same `lib/supabase.js` and `lib/kv.js` (or equivalent) so logic is shared with Express.

### 5.4 Sharing Logic Between Express and Vercel

To avoid duplicating business logic:

- Put **real** logic in `api/<resource>.js` (or under `api/<resource>/`) as a **default export** that receives `(req, res)`.
- In **Express** (`server.js`), for each path, **import and call** that handler:

  ```js
  app.get('/api/projects', async (req, res) => {
    const { default: handler } = await import('./api/projects.js');
    return handler(req, res);
  });
  ```

- On **Vercel**, the same `api/projects.js` file is used as the serverless entry. One implementation, two runtimes (Express for local, serverless on Vercel).

---

## 6. Frontend Changes

### 6.1 API Base URL

- **Local (full stack):** Frontend runs on Vite (e.g. 5173), API on Express (e.g. 3000). So the frontend must call `http://localhost:3000`.
- **Vercel:** Frontend and API are same origin; use relative URLs, e.g. `/api/projects`.

In `store.ts`, replace the current `API_BASE` (Supabase Edge Function URL) with something like:

```ts
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
```

Then:

- **Local:** In `.env` or `.env.local`, set `VITE_API_BASE_URL=http://localhost:3000` (or the port your Express uses).
- **Vercel:** Do **not** set `VITE_API_BASE_URL` (or set it to empty), so the app uses relative URLs and calls `/api/projects`, etc., on the same domain.

### 6.2 Endpoint Paths

Current store uses paths like `/projects`, `/customers`, `/vendorInvoices`. The new API will be under `/api/`. So either:

- Change `apiCall` to use a base that already includes `/api`, e.g.  
  `const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '') + '/api';`  
  and keep calling `apiCall('/projects')` → `GET ${API_BASE}/projects` = `GET http://localhost:3000/api/projects`, or
- Keep `API_BASE` as above and change every call to `apiCall('/api/projects')`, etc.

Recommendation: one base that ends with `/api` so existing `apiCall('/projects')` becomes `.../api/projects` with minimal edits.

### 6.3 Remove localStorage Fallback (Optional)

Today, when the API returns 404 or fails, the store falls back to localStorage. Once the new API is the only backend:

- You can remove the fallback and treat API errors as real errors (toast, retry, or show error state).
- Or keep a short transition period where fallback is still there for development without the server.

---

## 7. Implementation Checklist

Use this as a shared checklist for the team.

### Phase 1 — Supabase and shared lib

- [ ] Confirm Supabase project and KV table (or create tables) and Storage bucket.
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` and `VITE_SUPABASE_URL` to `.env` (and later Vercel).
- [ ] Add `lib/supabase.js`: create Supabase client with service role.
- [ ] Add `lib/kv.js`: implement get, set, del, getByPrefix using the same key names as the current Edge Function (e.g. `project:`, `customer:`, `vendor:`, `po:`, `vendorInvoice:`, `customerInvoice:`, `payment:`).

### Phase 2 — Express server (local)

- [ ] Add `server.js`: Express, CORS, json(), dotenv.
- [ ] Implement or mount routes for: health, projects, customers, vendors, users, employees, purchase-orders, vendorInvoices, customerInvoices, payments, print-templates (and any other entities in use).
- [ ] Implement document upload/delete/refresh-url using Supabase Storage in Express.
- [ ] Add scripts: `dev:server`, `dev:full` (and `dev` for frontend only).
- [ ] Test: run `npm run dev:full`, open app, confirm API calls go to Express and data comes from Supabase.

### Phase 3 — Vercel serverless

- [ ] Create `api/` folder with one (or more) file per resource, exporting default `handler(req, res)`.
- [ ] Reuse the same `lib/supabase.js` and `lib/kv.js` (or equivalent) inside `api/`.
- [ ] Update `vercel.json` so that only non-`api/` paths rewrite to `/index.html`.
- [ ] Deploy to Vercel and set env vars (no `VITE_API_BASE_URL` for production).
- [ ] Test: use the deployed app and confirm all list/create/update/delete and file uploads work.

### Phase 4 — Frontend

- [ ] In `store.ts`, set `API_BASE` from `import.meta.env.VITE_API_BASE_URL` and append `/api` so that all existing `apiCall('/projects')`-style calls hit `/api/projects`.
- [ ] Add `VITE_API_BASE_URL=http://localhost:3000` (or your Express port) in `.env.local` for local full-stack dev.
- [ ] Remove or simplify localStorage fallback once the new API is stable.
- [ ] Test local (dev:full) and production (Vercel) end-to-end.

---

## 8. Reference — registraion-demo Pattern

- **Local:** `server.js` runs with `app.listen(PORT)`. All routes live under `/api/` (e.g. `/api/send-email`, `/api/create-user`). Uses Supabase (and SendGrid/Twilio) via env.
- **Vercel:** `vercel.json` rewrites `/((?!api/).*)` → `/index.html`. So `/api/*` is handled by serverless. Each `api/<name>.js` exports a default `handler(req, res)` and uses the same env (e.g. `VITE_SUPABASE_URL`, `VITE_SERVICE_ROLE_KEY`).
- **Shared logic:** For some routes (e.g. search, ask-report), Express does not reimplement; it imports and calls the handler from `api/<name>.js`, so one implementation runs both locally and on Vercel.

Core Code can follow the same pattern: Express for local, Vercel serverless for production, Supabase for all storage, and a single API surface so the team can implement and reason about the backend in one place.

/**
 * Sets RLS policies for the 'project-documents' storage bucket.
 * Run: node --env-file=.env.local scripts/set-storage-policies.js
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const sqls = [
  `CREATE POLICY IF NOT EXISTS "project_documents_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'project-documents')`,
  `CREATE POLICY IF NOT EXISTS "project_documents_select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'project-documents')`,
  `CREATE POLICY IF NOT EXISTS "project_documents_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'project-documents')`,
];

for (const sql of sqls) {
  try {
    // Try using the pg meta endpoint
    const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    });
    const text = await res.text();
    if (res.ok) {
      console.log('OK:', sql.substring(0, 60));
    } else {
      console.warn('Could not set via RPC:', text.substring(0, 100));
    }
  } catch (e) {
    console.warn('Error:', e.message);
  }
}

console.log('\nDone. If policies could not be set automatically, run this SQL in Supabase SQL Editor:');
console.log(`
CREATE POLICY IF NOT EXISTS "project_documents_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'project-documents');

CREATE POLICY IF NOT EXISTS "project_documents_select" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'project-documents');

CREATE POLICY IF NOT EXISTS "project_documents_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'project-documents');
`);

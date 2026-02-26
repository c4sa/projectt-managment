/**
 * Applies RLS policies to the project-documents storage bucket via Management API.
 * Run: node --env-file=.env.local scripts/apply-storage-rls.js
 */
const projectRef = 'xajovccssbzxpodculue';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sql = `
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='project_documents_insert') THEN
      CREATE POLICY "project_documents_insert" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'project-documents');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='project_documents_select') THEN
      CREATE POLICY "project_documents_select" ON storage.objects
        FOR SELECT TO public
        USING (bucket_id = 'project-documents');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='project_documents_delete') THEN
      CREATE POLICY "project_documents_delete" ON storage.objects
        FOR DELETE TO authenticated
        USING (bucket_id = 'project-documents');
    END IF;
  END $$;
`;

// Use Supabase's pg endpoint for direct SQL
const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

async function run() {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text.substring(0, 300));

  if (!res.ok) {
    console.log('\nPlease run this SQL manually in the Supabase SQL Editor:');
    console.log(sql);
  } else {
    console.log('\nStorage RLS policies applied successfully!');
  }
}

run().catch(console.error);

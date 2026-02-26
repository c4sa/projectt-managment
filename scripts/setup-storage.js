/**
 * Creates the 'project-documents' Supabase Storage bucket if it doesn't exist,
 * and sets a permissive policy for authenticated users.
 *
 * Run: node --env-file=.env.local scripts/setup-storage.js
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET = 'project-documents';

async function main() {
  // Check if bucket already exists
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    console.error('Error listing buckets:', listErr.message);
    process.exit(1);
  }

  const exists = buckets?.some(b => b.name === BUCKET);

  if (exists) {
    console.log(`Bucket '${BUCKET}' already exists.`);
  } else {
    // Create bucket (public so files have accessible URLs)
    const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: null,  // allow all
    });

    if (createErr) {
      console.error('Error creating bucket:', createErr.message);
      process.exit(1);
    }
    console.log(`Bucket '${BUCKET}' created successfully.`);
  }

  // Insert permissive RLS policies via SQL (service role can do this)
  // Allow authenticated users to upload and read
  const policies = [
    {
      name: `${BUCKET}_authenticated_insert`,
      sql: `
        CREATE POLICY IF NOT EXISTS "${BUCKET}_authenticated_insert"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = '${BUCKET}');
      `,
    },
    {
      name: `${BUCKET}_authenticated_select`,
      sql: `
        CREATE POLICY IF NOT EXISTS "${BUCKET}_authenticated_select"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = '${BUCKET}');
      `,
    },
    {
      name: `${BUCKET}_authenticated_delete`,
      sql: `
        CREATE POLICY IF NOT EXISTS "${BUCKET}_authenticated_delete"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = '${BUCKET}');
      `,
    },
  ];

  for (const policy of policies) {
    const { error } = await supabase.rpc('exec_sql', { sql: policy.sql }).catch(() => ({ error: { message: 'exec_sql not available' } }));
    if (error) {
      // exec_sql may not be available — that's OK, user can set policies manually
      console.warn(`Could not set policy '${policy.name}' via RPC (set it manually in Supabase dashboard)`);
    } else {
      console.log(`Policy '${policy.name}' set.`);
    }
  }

  console.log('\nSetup complete!');
  console.log(`\nIMPORTANT: In Supabase dashboard → Storage → ${BUCKET} → Policies, ensure:`);
  console.log('  - authenticated users can INSERT (upload)');
  console.log('  - public can SELECT (read/download)');
  console.log('  - authenticated users can DELETE');
}

main().catch(console.error);

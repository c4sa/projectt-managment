/**
 * Pre-populate Supabase with an admin user.
 * - Creates the user in Supabase Auth (so they can log in).
 * - Inserts the matching record in app_users (so /api/auth/me returns name and role).
 *
 * Usage: node --env-file=.env.local scripts/seed-admin.js
 * Optional env: SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD (defaults below)
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SEED_ADMIN_EMAIL || 'ai@c4.sa';
const password = process.env.SEED_ADMIN_PASSWORD || '11111111';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Use: node --env-file=.env.local scripts/seed-admin.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('Creating admin user in Supabase Auth:', email);

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: 'Admin User' },
  });

  if (authError) {
    if (authError.message && authError.message.includes('already been registered')) {
      console.log('User already exists in Auth. Looking up by email to ensure app_users record exists...');
      const { data: existing } = await supabase.auth.admin.listUsers();
      const user = existing?.users?.find((u) => u.email === email);
      if (!user) {
        console.error('Could not find existing user:', authError.message);
        process.exit(1);
      }
      await upsertAppUser(user.id, user.email);
      console.log('app_users record ensured for existing auth user. You can log in with:', email);
      return;
    }
    console.error('Auth create failed:', authError.message);
    process.exit(1);
  }

  const user = authData?.user;
  if (!user) {
    console.error('No user returned from createUser');
    process.exit(1);
  }

  await upsertAppUser(user.id, user.email);
  console.log('Admin user created successfully.');
  console.log('  Email:', email);
  console.log('  Auth ID:', user.id);
  console.log('  Log in at your app and change the password in Profile Settings.');
}

async function upsertAppUser(authId, userEmail) {
  const now = new Date().toISOString();
  const { error } = await supabase.from('app_users').upsert(
    {
      id: authId,
      name: 'Admin User',
      email: userEmail,
      role: 'admin',
      status: 'active',
      created_at: now,
    },
    { onConflict: 'id' }
  );
  if (error) {
    console.error('app_users upsert failed:', error.message);
    process.exit(1);
  }
  console.log('app_users record upserted for id:', authId);
}

main();

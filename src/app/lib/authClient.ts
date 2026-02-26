/**
 * Frontend Supabase Auth client for login/session.
 * Used by AuthContext and store (getAccessToken for API calls).
 */
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;

export const supabaseAuth = createClient(supabaseUrl, publicAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export async function getSession() {
  const { data } = await supabaseAuth.auth.getSession();
  return data;
}

export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabaseAuth.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function signInWithPassword(params: { email: string; password: string }) {
  return supabaseAuth.auth.signInWithPassword(params);
}

export async function signOut() {
  return supabaseAuth.auth.signOut();
}

export function onAuthStateChange(
  callback: (event: string, session: import('@supabase/supabase-js').Session | null) => void
) {
  const {
    data: { subscription },
  } = supabaseAuth.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return subscription;
}

// Called by store when API returns 401; AuthContext registers a handler to clear user and redirect
let _onUnauthorized: () => void = () => {};
export function setOnUnauthorized(cb: () => void) {
  _onUnauthorized = cb;
}
export function notifyUnauthorized() {
  _onUnauthorized();
}

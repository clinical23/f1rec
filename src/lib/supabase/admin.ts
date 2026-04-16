import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client. Bypasses RLS.
 * NEVER import this from client components.
 * NEVER log the key. NEVER commit it.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

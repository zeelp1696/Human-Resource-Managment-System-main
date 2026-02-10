import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // Clear, actionable error for developers if env vars are missing
  throw new Error(
    '❌ Missing Supabase environment variables. Please create a .env (or .env.local) file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.\n' +
    'Example:\n' +
    'VITE_SUPABASE_URL=https://xyzcompany.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=your-anon-key\n' +
    'Then restart your dev server.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export default supabase;

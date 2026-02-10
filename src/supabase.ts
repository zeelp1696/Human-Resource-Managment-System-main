import supabase from './lib/supabase';

// Export the same supabase client everywhere to avoid duplicates
export { supabase };
export default supabase;
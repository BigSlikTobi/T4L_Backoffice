import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Configuration Error: NEXT_PUBLIC_SUPABASE_URL is not defined. " +
    "Please ensure this variable is set in a .env.local file in your project root, " +
    "and that you have restarted your Next.js development server. " +
    "Example: NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co"
  );
}
if (!supabaseAnonKey) {
  throw new Error(
    "Configuration Error: NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined. " +
    "Please ensure this variable is set in a .env.local file in your project root, " +
    "and that you have restarted your Next.js development server. " +
    "Example: NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

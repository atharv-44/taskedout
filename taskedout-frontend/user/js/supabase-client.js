// Initialize and export the Supabase client
const SUPABASE_URL = window.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.env.SUPABASE_ANON_KEY;

// Create a single Supabase client instance
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Make it globally accessible for all other scripts
window.supabaseClient = supabaseClient;
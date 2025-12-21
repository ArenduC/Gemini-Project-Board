
// FIX: Removed hardcoded GEMINI_API_KEY as per guidelines. API key is obtained from process.env.API_KEY in services/geminiService.ts.

// FIX: Added explicit string types to prevent TypeScript from inferring literal types, which causes comparison errors.
export const SUPABASE_URL: string = "https://gusrrfpuzjpgowblvjkl.supabase.co";
export const SUPABASE_ANON_KEY: string = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1c3JyZnB1empwZ293Ymx2amtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NDIxNTEsImV4cCI6MjA3MjMxODE1MX0.b6UTFeGlI7q-uDNW5j3PSxLiMFxwK4cwaogMY5WzHS0";

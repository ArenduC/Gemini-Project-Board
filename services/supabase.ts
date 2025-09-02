import { createClient } from '@supabase/supabase-js';
import { UserRole } from '../types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

// Add a check to ensure credentials are configured, preventing a crash on startup.
// FIX: The comparison type errors are fixed in config.ts by adding explicit string types.
if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE' || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY_HERE') {
  throw new Error("Supabase credentials are not configured. Please update the `config.ts` file with your Supabase URL and Anon Key.");
}

// Use credentials from the central config file.
const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define a type for our database schema to get type safety
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          avatar_url: string
          role: UserRole
        }
        Insert: {
          id: string
          name: string
          avatar_url: string
          role: UserRole
        }
        Update: {
          id?: string
          name?: string
          avatar_url?: string
          role?: UserRole
        }
      },
      // Add other tables here if needed for full type safety
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: "Admin" | "Manager" | "Member"
      task_priority: "Low" | "Medium" | "High" | "Urgent"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

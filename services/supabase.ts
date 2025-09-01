
import { createClient } from '@supabase/supabase-js';
import { UserRole } from '../types';

// The platform is responsible for injecting these environment variables.
// If they are not present, we use placeholder values to prevent the app from crashing on startup.
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder-anon-key';

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

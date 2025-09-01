
import { createClient } from '@supabase/supabase-js';
import { UserRole } from '../types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

// Use credentials from the central config file.
const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;

if (supabaseUrl === 'https://placeholder.supabase.co') {
  console.warn('Supabase credentials are not configured. Please add your credentials to config.ts');
}

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
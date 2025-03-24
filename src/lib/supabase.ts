import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from './database.types';

const supabaseUrl = 'https://wbimxxrbzgynigwolcnk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiaW14eHJiemd5bmlnd29sY25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY0MDg1OTYsImV4cCI6MjA1MTk4NDU5Nn0.0kM04sBRE9x0pGMpubUjfkbXgp-c1aRoRdsCAz2cPV0';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// Helper functions for common database operations
export const db = {
  // Profiles
  profiles: {
    get: async (userId: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    },
    update: async (userId: string, updates: any) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
  },
  
  // Add other table operations here
};

// Add this function to help explore tables
export async function exploreDatabase() {
  // List all tables
  const { data: tables } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');
  
  console.log('Available tables:', tables);

  // For each table, get its structure
  for (const table of tables || []) {
    const { data: columns } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', table.table_name)
      .eq('table_schema', 'public');
    
    console.log(`\nTable: ${table.table_name}`);
    console.log('Columns:', columns);
  }
} 
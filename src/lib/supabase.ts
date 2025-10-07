import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://wbimxxrbzgynigwolcnk.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiaW14eHJiemd5bmlnd29sY25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY0MDg1OTYsImV4cCI6MjA1MTk4NDU5Nn0.0kM04sBRE9x0pGMpubUjfkbXgp-c1aRoRdsCAz2cPV0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Helper functions for common database operations
export const db = {
  // Profiles
  profiles: {
    get: async (userId: string) => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

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

  // Events
  events: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(
          `
          *,
          creator:profiles!events_created_by_fkey(
            id,
            full_name,
            avatar_url
          )
        `,
        )
        .eq('visibility', 'public')
        .order('event_date', { ascending: true });

      if (error) throw error;

      // Get attendee counts separately
      if (data) {
        const eventsWithCounts = await Promise.all(
          data.map(async (event) => {
            const { count } = await supabase
              .from('event_attendees')
              .select('*', { count: 'exact', head: true })
              .eq('event_id', event.id)
              .eq('status', 'accepted');

            return {
              ...event,
              attendees: [{ count: count || 0 }],
            };
          }),
        );
        return eventsWithCounts;
      }

      return data;
    },

    getById: async (id: string) => {
      const { data, error } = await supabase
        .from('events')
        .select(
          `
          *,
          creator:profiles!events_created_by_fkey(
            id,
            full_name,
            avatar_url
          ),
          attendees:event_attendees(
            id,
            user_id,
            status,
            invited_at,
            responded_at,
            user:profiles!event_attendees_user_id_fkey(
              id,
              full_name,
              avatar_url
            )
          )
        `,
        )
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },

    create: async (eventData: {
      title: string;
      description?: string;
      location?: string;
      visibility?: 'public' | 'private' | 'invite-only';
      event_date?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('events')
        .insert({
          ...eventData,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    update: async (
      id: string,
      updates: {
        title?: string;
        description?: string;
        location?: string;
        visibility?: 'public' | 'private' | 'invite-only';
        event_date?: string;
      },
    ) => {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    delete: async (id: string) => {
      const { error } = await supabase.from('events').delete().eq('id', id);

      if (error) throw error;
    },

    addAttendee: async (eventId: string, userId: string) => {
      const { data, error } = await supabase
        .from('event_attendees')
        .insert({
          event_id: eventId,
          user_id: userId,
          status: 'invited',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    updateAttendeeStatus: async (
      eventId: string,
      userId: string,
      status: 'accepted' | 'rejected',
    ) => {
      const { data, error } = await supabase
        .from('event_attendees')
        .update({
          status,
          responded_at: new Date().toISOString(),
        })
        .eq('event_id', eventId)
        .eq('user_id', userId)
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

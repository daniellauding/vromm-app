export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      ambassador_signups: {
        Row: {
          admin_notes: string | null
          area_of_interest: string | null
          availability: string | null
          browser_id: string
          created_at: string | null
          email: string
          experience_level: string | null
          id: string
          language: string | null
          location: string
          metadata: Json | null
          motivation: string | null
          name: string
          phone: string | null
          social_media: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          area_of_interest?: string | null
          availability?: string | null
          browser_id: string
          created_at?: string | null
          email: string
          experience_level?: string | null
          id?: string
          language?: string | null
          location: string
          metadata?: Json | null
          motivation?: string | null
          name: string
          phone?: string | null
          social_media?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          area_of_interest?: string | null
          availability?: string | null
          browser_id?: string
          created_at?: string | null
          email?: string
          experience_level?: string | null
          id?: string
          language?: string | null
          location?: string
          metadata?: Json | null
          motivation?: string | null
          name?: string
          phone?: string | null
          social_media?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      beta_signups: {
        Row: {
          created_at: string | null
          email: string
          experience_level: string | null
          goals: string | null
          has_license: string | null
          id: string
          language: string | null
          location: string | null
          message: string | null
          notifications: boolean | null
          opt_out: boolean | null
          opt_out_token: string | null
          platform: string
          preferred_time: string | null
          referral: string | null
          status: string | null
          user_city: string | null
          user_country: string | null
          user_latitude: number | null
          user_longitude: number | null
          user_type: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          experience_level?: string | null
          goals?: string | null
          has_license?: string | null
          id?: string
          language?: string | null
          location?: string | null
          message?: string | null
          notifications?: boolean | null
          opt_out?: boolean | null
          opt_out_token?: string | null
          platform: string
          preferred_time?: string | null
          referral?: string | null
          status?: string | null
          user_city?: string | null
          user_country?: string | null
          user_latitude?: number | null
          user_longitude?: number | null
          user_type?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          experience_level?: string | null
          goals?: string | null
          has_license?: string | null
          id?: string
          language?: string | null
          location?: string | null
          message?: string | null
          notifications?: boolean | null
          opt_out?: boolean | null
          opt_out_token?: string | null
          platform?: string
          preferred_time?: string | null
          referral?: string | null
          status?: string | null
          user_city?: string | null
          user_country?: string | null
          user_latitude?: number | null
          user_longitude?: number | null
          user_type?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      beta_test_assignments: {
        Row: {
          assignment_id: string
          browser_id: string
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          is_completed: boolean | null
          metadata: Json | null
          order_index: number | null
          role: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assignment_id: string
          browser_id: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean | null
          metadata?: Json | null
          order_index?: number | null
          role: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assignment_id?: string
          browser_id?: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean | null
          metadata?: Json | null
          order_index?: number | null
          role?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      beta_test_feedback: {
        Row: {
          admin_notes: string | null
          browser_id: string | null
          comment: string
          created_at: string | null
          email: string
          feedback_type: string
          id: string
          image_url: string | null
          metadata: Json | null
          name: string
          priority: string | null
          rating: number
          role: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          browser_id?: string | null
          comment: string
          created_at?: string | null
          email: string
          feedback_type?: string
          id?: string
          image_url?: string | null
          metadata?: Json | null
          name: string
          priority?: string | null
          rating: number
          role: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          browser_id?: string | null
          comment?: string
          created_at?: string | null
          email?: string
          feedback_type?: string
          id?: string
          image_url?: string | null
          metadata?: Json | null
          name?: string
          priority?: string | null
          rating?: number
          role?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          status: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          status?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          status?: string | null
        }
        Relationships: []
      }
      content: {
        Row: {
          active: boolean
          body: Json
          category: string | null
          category_id: string | null
          content_type: string
          created_at: string | null
          embed_code: string | null
          has_language_images: boolean | null
          icon: string | null
          icon_color: string | null
          icon_svg: string | null
          id: string
          iframe_embed: string | null
          image_url: string | null
          images: Json | null
          key: string | null
          media_enabled: boolean | null
          media_type: string | null
          order_index: number
          platforms: string[]
          target: string | null
          title: Json
          updated_at: string | null
          youtube_embed: string | null
        }
        Insert: {
          active?: boolean
          body?: Json
          category?: string | null
          category_id?: string | null
          content_type: string
          created_at?: string | null
          embed_code?: string | null
          has_language_images?: boolean | null
          icon?: string | null
          icon_color?: string | null
          icon_svg?: string | null
          id?: string
          iframe_embed?: string | null
          image_url?: string | null
          images?: Json | null
          key?: string | null
          media_enabled?: boolean | null
          media_type?: string | null
          order_index?: number
          platforms?: string[]
          target?: string | null
          title?: Json
          updated_at?: string | null
          youtube_embed?: string | null
        }
        Update: {
          active?: boolean
          body?: Json
          category?: string | null
          category_id?: string | null
          content_type?: string
          created_at?: string | null
          embed_code?: string | null
          has_language_images?: boolean | null
          icon?: string | null
          icon_color?: string | null
          icon_svg?: string | null
          id?: string
          iframe_embed?: string | null
          image_url?: string | null
          images?: Json | null
          key?: string | null
          media_enabled?: boolean | null
          media_type?: string | null
          order_index?: number
          platforms?: string[]
          target?: string | null
          title?: Json
          updated_at?: string | null
          youtube_embed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tour_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          is_admin: boolean | null
          joined_at: string | null
          left_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_admin?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_admin?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_group: boolean | null
          last_message_at: string | null
          name: string | null
          type: Database["public"]["Enums"]["conversation_type"] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_group?: boolean | null
          last_message_at?: string | null
          name?: string | null
          type?: Database["public"]["Enums"]["conversation_type"] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_group?: boolean | null
          last_message_at?: string | null
          name?: string | null
          type?: Database["public"]["Enums"]["conversation_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_quiz_attempts: {
        Row: {
          attempt_number: number
          completed_at: string | null
          correct_answers: number
          created_at: string | null
          exercise_id: string
          id: string
          is_completed: boolean | null
          pass_threshold: number | null
          passed: boolean | null
          route_id: string | null
          score_percentage: number
          started_at: string | null
          time_spent_seconds: number | null
          total_questions: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          attempt_number?: number
          completed_at?: string | null
          correct_answers?: number
          created_at?: string | null
          exercise_id: string
          id?: string
          is_completed?: boolean | null
          pass_threshold?: number | null
          passed?: boolean | null
          route_id?: string | null
          score_percentage?: number
          started_at?: string | null
          time_spent_seconds?: number | null
          total_questions: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          attempt_number?: number
          completed_at?: string | null
          correct_answers?: number
          created_at?: string | null
          exercise_id?: string
          id?: string
          is_completed?: boolean | null
          pass_threshold?: number | null
          passed?: boolean | null
          route_id?: string | null
          score_percentage?: number
          started_at?: string | null
          time_spent_seconds?: number | null
          total_questions?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_quiz_attempts_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      driven_routes: {
        Row: {
          driven_at: string | null
          id: string
          route_id: string | null
          user_id: string | null
        }
        Insert: {
          driven_at?: string | null
          id?: string
          route_id?: string | null
          user_id?: string | null
        }
        Update: {
          driven_at?: string | null
          id?: string
          route_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driven_routes_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driven_routes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driven_routes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driven_routes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driven_routes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      driving_sessions: {
        Row: {
          created_at: string | null
          creator_id: string
          description: string | null
          end_time: string
          id: string
          location_address: string | null
          location_name: string | null
          session_type: string | null
          start_time: string
          status: string | null
          student_id: string | null
          supervisor_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          description?: string | null
          end_time: string
          id?: string
          location_address?: string | null
          location_name?: string | null
          session_type?: string | null
          start_time: string
          status?: string | null
          student_id?: string | null
          supervisor_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          description?: string | null
          end_time?: string
          id?: string
          location_address?: string | null
          location_name?: string | null
          session_type?: string | null
          start_time?: string
          status?: string | null
          student_id?: string | null
          supervisor_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driving_sessions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driving_sessions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driving_sessions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driving_sessions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driving_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driving_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driving_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driving_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driving_sessions_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driving_sessions_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driving_sessions_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driving_sessions_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          event_id: string | null
          id: string
          invited_at: string | null
          responded_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          event_id?: string | null
          id?: string
          invited_at?: string | null
          responded_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          event_id?: string | null
          id?: string
          invited_at?: string | null
          responded_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          embeds: Json | null
          event_date: string | null
          id: string
          is_recurring_instance: boolean | null
          location: string | null
          media: Json | null
          parent_event_id: string | null
          recurrence_count: number | null
          recurrence_end_date: string | null
          recurrence_rule: Json | null
          reminders: Json | null
          repeat: string | null
          title: string
          updated_at: string | null
          visibility: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          embeds?: Json | null
          event_date?: string | null
          id?: string
          is_recurring_instance?: boolean | null
          location?: string | null
          media?: Json | null
          parent_event_id?: string | null
          recurrence_count?: number | null
          recurrence_end_date?: string | null
          recurrence_rule?: Json | null
          reminders?: Json | null
          repeat?: string | null
          title: string
          updated_at?: string | null
          visibility?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          embeds?: Json | null
          event_date?: string | null
          id?: string
          is_recurring_instance?: boolean | null
          location?: string | null
          media?: Json | null
          parent_event_id?: string | null
          recurrence_count?: number | null
          recurrence_end_date?: string | null
          recurrence_rule?: Json | null
          reminders?: Json | null
          repeat?: string | null
          title?: string
          updated_at?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_quiz_answers: {
        Row: {
          answer_text: Json
          created_at: string | null
          embed_code: string | null
          explanation_text: Json | null
          icon: string | null
          id: string
          image: string | null
          is_correct: boolean | null
          order_index: number | null
          question_id: string
          updated_at: string | null
          youtube_url: string | null
        }
        Insert: {
          answer_text?: Json
          created_at?: string | null
          embed_code?: string | null
          explanation_text?: Json | null
          icon?: string | null
          id?: string
          image?: string | null
          is_correct?: boolean | null
          order_index?: number | null
          question_id: string
          updated_at?: string | null
          youtube_url?: string | null
        }
        Update: {
          answer_text?: Json
          created_at?: string | null
          embed_code?: string | null
          explanation_text?: Json | null
          icon?: string | null
          id?: string
          image?: string | null
          is_correct?: boolean | null
          order_index?: number | null
          question_id?: string
          updated_at?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "exercise_quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_quiz_questions: {
        Row: {
          created_at: string | null
          embed_code: string | null
          exercise_id: string
          explanation_text: Json | null
          icon: string | null
          id: string
          image: string | null
          language_specific_media: boolean | null
          order_index: number | null
          points: number | null
          question_text: Json
          question_type: string
          required: boolean | null
          updated_at: string | null
          youtube_url: string | null
        }
        Insert: {
          created_at?: string | null
          embed_code?: string | null
          exercise_id: string
          explanation_text?: Json | null
          icon?: string | null
          id?: string
          image?: string | null
          language_specific_media?: boolean | null
          order_index?: number | null
          points?: number | null
          question_text?: Json
          question_type?: string
          required?: boolean | null
          updated_at?: string | null
          youtube_url?: string | null
        }
        Update: {
          created_at?: string | null
          embed_code?: string | null
          exercise_id?: string
          explanation_text?: Json | null
          icon?: string | null
          id?: string
          image?: string | null
          language_specific_media?: boolean | null
          order_index?: number | null
          points?: number | null
          question_text?: Json
          question_type?: string
          required?: boolean | null
          updated_at?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_quiz_questions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "learning_path_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          exercises_completed: number | null
          id: string
          metadata: Json | null
          route_id: string
          started_at: string
          status: string
          total_duration: number | null
          total_time: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          exercises_completed?: number | null
          id?: string
          metadata?: Json | null
          route_id: string
          started_at?: string
          status?: string
          total_duration?: number | null
          total_time?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          exercises_completed?: number | null
          id?: string
          metadata?: Json | null
          route_id?: string
          started_at?: string
          status?: string
          total_duration?: number | null
          total_time?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sessions_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_templates: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          default_repeat_count: number | null
          description: Json
          embed_code: string | null
          icon: string | null
          id: string
          image: string | null
          is_locked: boolean | null
          is_public: boolean | null
          language_specific_media: boolean | null
          tags: string[] | null
          title: Json
          updated_at: string | null
          usage_count: number | null
          youtube_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          default_repeat_count?: number | null
          description?: Json
          embed_code?: string | null
          icon?: string | null
          id?: string
          image?: string | null
          is_locked?: boolean | null
          is_public?: boolean | null
          language_specific_media?: boolean | null
          tags?: string[] | null
          title?: Json
          updated_at?: string | null
          usage_count?: number | null
          youtube_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          default_repeat_count?: number | null
          description?: Json
          embed_code?: string | null
          icon?: string | null
          id?: string
          image?: string | null
          is_locked?: boolean | null
          is_public?: boolean | null
          language_specific_media?: boolean | null
          tags?: string[] | null
          title?: Json
          updated_at?: string | null
          usage_count?: number | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          id: string
          media: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          media?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          media?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          created_at: string
          email: string
          id: string
          inviter_id: string
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["invite_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          inviter_id: string
          role: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          inviter_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      languages: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      learning_path_categories: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_default: boolean | null
          label: string
          order_index: number | null
          updated_at: string | null
          value: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label: string
          order_index?: number | null
          updated_at?: string | null
          value: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label?: string
          order_index?: number | null
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      learning_path_exercise_completions: {
        Row: {
          completed_at: string | null
          exercise_id: string
          id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          exercise_id: string
          id?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          exercise_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_path_exercise_completions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "learning_path_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_path_exercises: {
        Row: {
          bypass_order: boolean | null
          completed: boolean
          created_at: string
          description: Json | null
          embed_code: string | null
          icon: string | null
          id: string
          image: string | null
          is_locked: boolean | null
          language_specific_media: boolean | null
          learning_path_id: string
          lock_password: string | null
          order_index: number
          paywall_enabled: boolean | null
          price_sek: number | null
          price_usd: number | null
          repeat_count: number | null
          source_route_id: string | null
          source_type: string | null
          title: Json
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          bypass_order?: boolean | null
          completed?: boolean
          created_at?: string
          description?: Json | null
          embed_code?: string | null
          icon?: string | null
          id?: string
          image?: string | null
          is_locked?: boolean | null
          language_specific_media?: boolean | null
          learning_path_id: string
          lock_password?: string | null
          order_index?: number
          paywall_enabled?: boolean | null
          price_sek?: number | null
          price_usd?: number | null
          repeat_count?: number | null
          source_route_id?: string | null
          source_type?: string | null
          title?: Json
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          bypass_order?: boolean | null
          completed?: boolean
          created_at?: string
          description?: Json | null
          embed_code?: string | null
          icon?: string | null
          id?: string
          image?: string | null
          is_locked?: boolean | null
          language_specific_media?: boolean | null
          learning_path_id?: string
          lock_password?: string | null
          order_index?: number
          paywall_enabled?: boolean | null
          price_sek?: number | null
          price_usd?: number | null
          repeat_count?: number | null
          source_route_id?: string | null
          source_type?: string | null
          title?: Json
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_path_exercises_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_path_exercises_source_route_id_fkey"
            columns: ["source_route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_path_progress: {
        Row: {
          completed_exercises: Json | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          learning_path_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_exercises?: Json | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          learning_path_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_exercises?: Json | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          learning_path_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_path_progress_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_paths: {
        Row: {
          active: boolean
          bypass_order: boolean | null
          created_at: string
          description: Json
          exercises: Json | null
          experience_level: string | null
          icon: string | null
          id: string
          image: string | null
          is_locked: boolean | null
          language_specific_media: boolean | null
          license_type: string | null
          lock_password: string | null
          order_index: number
          paywall_enabled: boolean | null
          platform: string | null
          price_sek: number | null
          price_usd: number | null
          purpose: string | null
          title: Json
          transmission_type: string | null
          type: string | null
          updated_at: string
          user_profile: string | null
          vehicle_type: string | null
          youtube_url: string | null
        }
        Insert: {
          active?: boolean
          bypass_order?: boolean | null
          created_at?: string
          description?: Json
          exercises?: Json | null
          experience_level?: string | null
          icon?: string | null
          id?: string
          image?: string | null
          is_locked?: boolean | null
          language_specific_media?: boolean | null
          license_type?: string | null
          lock_password?: string | null
          order_index?: number
          paywall_enabled?: boolean | null
          platform?: string | null
          price_sek?: number | null
          price_usd?: number | null
          purpose?: string | null
          title?: Json
          transmission_type?: string | null
          type?: string | null
          updated_at?: string
          user_profile?: string | null
          vehicle_type?: string | null
          youtube_url?: string | null
        }
        Update: {
          active?: boolean
          bypass_order?: boolean | null
          created_at?: string
          description?: Json
          exercises?: Json | null
          experience_level?: string | null
          icon?: string | null
          id?: string
          image?: string | null
          is_locked?: boolean | null
          language_specific_media?: boolean | null
          license_type?: string | null
          lock_password?: string | null
          order_index?: number
          paywall_enabled?: boolean | null
          platform?: string | null
          price_sek?: number | null
          price_usd?: number | null
          purpose?: string | null
          title?: Json
          transmission_type?: string | null
          type?: string | null
          updated_at?: string
          user_profile?: string | null
          vehicle_type?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      learning_plan_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_index: number
          plan_id: string | null
          required: boolean | null
          route_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_index: number
          plan_id?: string | null
          required?: boolean | null
          route_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_index?: number
          plan_id?: string | null
          required?: boolean | null
          route_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "learning_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_plan_items_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_plans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          school_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          school_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          school_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_plans_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          latitude: number
          longitude: number
          name: string
          type: Database["public"]["Enums"]["location_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          latitude: number
          longitude: number
          name: string
          type: Database["public"]["Enums"]["location_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          type?: Database["public"]["Enums"]["location_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          alt_text: Json
          category: string
          created_at: string | null
          filename: string
          id: string
          updated_at: string | null
          url: string
        }
        Insert: {
          alt_text?: Json
          category?: string
          created_at?: string | null
          filename: string
          id?: string
          updated_at?: string | null
          url: string
        }
        Update: {
          alt_text?: Json
          category?: string
          created_at?: string | null
          filename?: string
          id?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      message_reads: {
        Row: {
          id: string
          message_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          message_type: string | null
          metadata: Json | null
          reply_to_id: string | null
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          reply_to_id?: string | null
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          reply_to_id?: string | null
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          target_id: string | null
          type: Database["public"]["Enums"]["notification_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          target_id?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          target_id?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_slides: {
        Row: {
          active: boolean
          created_at: string | null
          icon: string | null
          icon_color: string | null
          id: string
          image_url: string | null
          order: number
          text_en: string
          text_sv: string
          title_en: string
          title_sv: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          icon?: string | null
          icon_color?: string | null
          id?: string
          image_url?: string | null
          order?: number
          text_en: string
          text_sv: string
          title_en: string
          title_sv: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string | null
          icon?: string | null
          icon_color?: string | null
          id?: string
          image_url?: string | null
          order?: number
          text_en?: string
          text_sv?: string
          title_en?: string
          title_sv?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      partner_applications: {
        Row: {
          company_name: string | null
          created_at: string
          email: string
          id: string
          message: string | null
          status: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email: string
          id?: string
          message?: string | null
          status?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          status?: string | null
        }
        Relationships: []
      }
      partner_requests: {
        Row: {
          business_hours: string | null
          contact_person: string | null
          created_at: string
          email: string
          fleet_size: number | null
          id: string
          languages: string[] | null
          location: string
          marketing_consent: boolean | null
          message: string | null
          phone: string | null
          preferred_contact: string | null
          school_name: string
          services: string[] | null
          status: string | null
          user_city: string | null
          user_country: string | null
          user_latitude: number | null
          user_longitude: number | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          website: string | null
          years_in_business: number | null
        }
        Insert: {
          business_hours?: string | null
          contact_person?: string | null
          created_at?: string
          email: string
          fleet_size?: number | null
          id?: string
          languages?: string[] | null
          location: string
          marketing_consent?: boolean | null
          message?: string | null
          phone?: string | null
          preferred_contact?: string | null
          school_name: string
          services?: string[] | null
          status?: string | null
          user_city?: string | null
          user_country?: string | null
          user_latitude?: number | null
          user_longitude?: number | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          website?: string | null
          years_in_business?: number | null
        }
        Update: {
          business_hours?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string
          fleet_size?: number | null
          id?: string
          languages?: string[] | null
          location?: string
          marketing_consent?: boolean | null
          message?: string | null
          phone?: string | null
          preferred_contact?: string | null
          school_name?: string
          services?: string[] | null
          status?: string | null
          user_city?: string | null
          user_country?: string | null
          user_latitude?: number | null
          user_longitude?: number | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          website?: string | null
          years_in_business?: number | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          metadata: Json | null
          payment_method: string
          payment_provider_id: string
          processed_at: string | null
          status: string
          subscription_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          payment_method: string
          payment_provider_id: string
          processed_at?: string | null
          status?: string
          subscription_id?: string | null
          transaction_type?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string
          payment_provider_id?: string
          processed_at?: string | null
          status?: string
          subscription_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string | null
          email: string
          id: string
          invited_by: string | null
          metadata: Json | null
          role: Database["public"]["Enums"]["user_role"] | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email: string
          id?: string
          invited_by?: string | null
          metadata?: Json | null
          role?: Database["public"]["Enums"]["user_role"] | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email?: string
          id?: string
          invited_by?: string | null
          metadata?: Json | null
          role?: Database["public"]["Enums"]["user_role"] | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          created_at: string | null
          id: string
          platform: string
          settings: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          platform: string
          settings?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          platform?: string
          settings?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      pricing_survey: {
        Row: {
          browser_id: string
          created_at: string | null
          custom_features: string[] | null
          custom_price: string | null
          id: string
          language: string | null
          metadata: Json | null
          price_motivation: string | null
          selected_features: string[] | null
          selected_plan: string
          updated_at: string | null
          user_email: string | null
        }
        Insert: {
          browser_id: string
          created_at?: string | null
          custom_features?: string[] | null
          custom_price?: string | null
          id?: string
          language?: string | null
          metadata?: Json | null
          price_motivation?: string | null
          selected_features?: string[] | null
          selected_plan: string
          updated_at?: string | null
          user_email?: string | null
        }
        Update: {
          browser_id?: string
          created_at?: string | null
          custom_features?: string[] | null
          custom_price?: string | null
          id?: string
          language?: string | null
          metadata?: Json | null
          price_motivation?: string | null
          selected_features?: string[] | null
          selected_plan?: string
          updated_at?: string | null
          user_email?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          apple_customer_id: string | null
          avatar_url: string | null
          birthdate: string | null
          created_at: string
          email: string | null
          experience_level:
            | Database["public"]["Enums"]["experience_level"]
            | null
          follower_count: number | null
          following_count: number | null
          full_name: string
          id: string
          last_driving_session: string | null
          license_plan_completed: boolean | null
          license_plan_data: Json | null
          location: string
          location_lat: number | null
          location_lng: number | null
          onboarding_completed: boolean | null
          organization_number: string | null
          private_profile: boolean
          role: Database["public"]["Enums"]["user_role"]
          role_confirmed: boolean | null
          school_id: string | null
          stripe_customer_id: string | null
          total_driving_distance: number | null
          total_driving_sessions: number | null
          total_driving_time: number | null
          total_routes_created: number | null
          updated_at: string
        }
        Insert: {
          apple_customer_id?: string | null
          avatar_url?: string | null
          birthdate?: string | null
          created_at?: string
          email?: string | null
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          follower_count?: number | null
          following_count?: number | null
          full_name: string
          id: string
          last_driving_session?: string | null
          license_plan_completed?: boolean | null
          license_plan_data?: Json | null
          location: string
          location_lat?: number | null
          location_lng?: number | null
          onboarding_completed?: boolean | null
          organization_number?: string | null
          private_profile?: boolean
          role: Database["public"]["Enums"]["user_role"]
          role_confirmed?: boolean | null
          school_id?: string | null
          stripe_customer_id?: string | null
          total_driving_distance?: number | null
          total_driving_sessions?: number | null
          total_driving_time?: number | null
          total_routes_created?: number | null
          updated_at?: string
        }
        Update: {
          apple_customer_id?: string | null
          avatar_url?: string | null
          birthdate?: string | null
          created_at?: string
          email?: string | null
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          follower_count?: number | null
          following_count?: number | null
          full_name?: string
          id?: string
          last_driving_session?: string | null
          license_plan_completed?: boolean | null
          license_plan_data?: Json | null
          location?: string
          location_lat?: number | null
          location_lng?: number | null
          onboarding_completed?: boolean | null
          organization_number?: string | null
          private_profile?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          role_confirmed?: boolean | null
          school_id?: string | null
          stripe_customer_id?: string | null
          total_driving_distance?: number | null
          total_driving_sessions?: number | null
          total_driving_time?: number | null
          total_routes_created?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_answers: {
        Row: {
          answer_text: Json
          created_at: string | null
          id: string
          is_correct: boolean | null
          order_index: number | null
          question_id: string
          updated_at: string | null
        }
        Insert: {
          answer_text: Json
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          order_index?: number | null
          question_id: string
          updated_at?: string | null
        }
        Update: {
          answer_text?: Json
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          order_index?: number | null
          question_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          attempt_number: number
          completed_at: string | null
          correct_answers: number | null
          created_at: string | null
          exercise_id: string
          id: string
          is_completed: boolean | null
          pass_threshold: number | null
          passed: boolean | null
          score_percentage: number | null
          started_at: string | null
          time_spent_seconds: number | null
          total_questions: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attempt_number?: number
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string | null
          exercise_id: string
          id?: string
          is_completed?: boolean | null
          pass_threshold?: number | null
          passed?: boolean | null
          score_percentage?: number | null
          started_at?: string | null
          time_spent_seconds?: number | null
          total_questions: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attempt_number?: number
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string | null
          exercise_id?: string
          id?: string
          is_completed?: boolean | null
          pass_threshold?: number | null
          passed?: boolean | null
          score_percentage?: number | null
          started_at?: string | null
          time_spent_seconds?: number | null
          total_questions?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quiz_question_attempts: {
        Row: {
          answered_at: string | null
          created_at: string | null
          id: string
          is_correct: boolean
          points_earned: number | null
          question_id: string
          quiz_attempt_id: string
          selected_answer_ids: Json
          time_spent_seconds: number | null
        }
        Insert: {
          answered_at?: string | null
          created_at?: string | null
          id?: string
          is_correct?: boolean
          points_earned?: number | null
          question_id: string
          quiz_attempt_id: string
          selected_answer_ids?: Json
          time_spent_seconds?: number | null
        }
        Update: {
          answered_at?: string | null
          created_at?: string | null
          id?: string
          is_correct?: boolean
          points_earned?: number | null
          question_id?: string
          quiz_attempt_id?: string
          selected_answer_ids?: Json
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_question_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "exercise_quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_question_attempts_quiz_attempt_id_fkey"
            columns: ["quiz_attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          created_at: string | null
          exercise_id: string
          explanation_text: Json | null
          id: string
          image: string | null
          order_index: number | null
          points: number | null
          question_text: Json
          question_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          exercise_id: string
          explanation_text?: Json | null
          id?: string
          image?: string | null
          order_index?: number | null
          points?: number | null
          question_text: Json
          question_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          exercise_id?: string
          explanation_text?: Json | null
          id?: string
          image?: string | null
          order_index?: number | null
          points?: number | null
          question_text?: Json
          question_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          content: string | null
          created_at: string
          id: string
          report_type: Database["public"]["Enums"]["report_type"]
          reportable_id: string
          reportable_type: Database["public"]["Enums"]["reportable_type"]
          reporter_id: string
          status: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          report_type: Database["public"]["Enums"]["report_type"]
          reportable_id: string
          reportable_type: Database["public"]["Enums"]["reportable_type"]
          reporter_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          report_type?: Database["public"]["Enums"]["report_type"]
          reportable_id?: string
          reportable_type?: Database["public"]["Enums"]["reportable_type"]
          reporter_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      route_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          route_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          route_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          route_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_comments_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      route_exercise_completions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          exercise_id: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          exercise_id: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          exercise_id?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_exercise_completions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "route_exercise_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      route_exercise_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          exercise_id: string
          id: string
          media_attachments: Json | null
          rating: number | null
          reviewer_id: string
          reviewer_role: string
          route_id: string
          updated_at: string | null
          visibility: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          exercise_id: string
          id?: string
          media_attachments?: Json | null
          rating?: number | null
          reviewer_id: string
          reviewer_role: string
          route_id: string
          updated_at?: string | null
          visibility?: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          exercise_id?: string
          id?: string
          media_attachments?: Json | null
          rating?: number | null
          reviewer_id?: string
          reviewer_role?: string
          route_id?: string
          updated_at?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_exercise_reviews_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      route_exercise_sessions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_exercise_index: number | null
          exercises_completed: number | null
          id: string
          route_id: string
          started_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_exercise_index?: number | null
          exercises_completed?: number | null
          id?: string
          route_id: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_exercise_index?: number | null
          exercises_completed?: number | null
          id?: string
          route_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_exercise_sessions_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      route_reviews: {
        Row: {
          completed_exercises: Json | null
          content: string | null
          created_at: string
          difficulty: Database["public"]["Enums"]["review_difficulty"]
          id: string
          images: Json | null
          rating: number
          route_id: string
          tags: string[] | null
          updated_at: string
          user_id: string
          visited_at: string | null
        }
        Insert: {
          completed_exercises?: Json | null
          content?: string | null
          created_at?: string
          difficulty: Database["public"]["Enums"]["review_difficulty"]
          id?: string
          images?: Json | null
          rating: number
          route_id: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
          visited_at?: string | null
        }
        Update: {
          completed_exercises?: Json | null
          content?: string | null
          created_at?: string
          difficulty?: Database["public"]["Enums"]["review_difficulty"]
          id?: string
          images?: Json | null
          rating?: number
          route_id?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          visited_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_reviews_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      route_submissions: {
        Row: {
          activity_level: string | null
          best_season: string | null
          best_time: string | null
          best_times: string | null
          created_at: string
          custom_tags: string[] | null
          difficulty: string | null
          duration: string | null
          email: string
          hazards: string[] | null
          id: string
          image_urls: string[] | null
          instructor_notes: string | null
          location: string | null
          message: string | null
          parking_available: boolean | null
          route: string | null
          route_features: string[] | null
          route_type: string | null
          status: string | null
          traffic_level: string | null
          transmission_type: string | null
          user_city: string | null
          user_country: string | null
          user_latitude: number | null
          user_longitude: number | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          vehicle_type: string | null
        }
        Insert: {
          activity_level?: string | null
          best_season?: string | null
          best_time?: string | null
          best_times?: string | null
          created_at?: string
          custom_tags?: string[] | null
          difficulty?: string | null
          duration?: string | null
          email: string
          hazards?: string[] | null
          id?: string
          image_urls?: string[] | null
          instructor_notes?: string | null
          location?: string | null
          message?: string | null
          parking_available?: boolean | null
          route?: string | null
          route_features?: string[] | null
          route_type?: string | null
          status?: string | null
          traffic_level?: string | null
          transmission_type?: string | null
          user_city?: string | null
          user_country?: string | null
          user_latitude?: number | null
          user_longitude?: number | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          vehicle_type?: string | null
        }
        Update: {
          activity_level?: string | null
          best_season?: string | null
          best_time?: string | null
          best_times?: string | null
          created_at?: string
          custom_tags?: string[] | null
          difficulty?: string | null
          duration?: string | null
          email?: string
          hazards?: string[] | null
          id?: string
          image_urls?: string[] | null
          instructor_notes?: string | null
          location?: string | null
          message?: string | null
          parking_available?: boolean | null
          route?: string | null
          route_features?: string[] | null
          route_type?: string | null
          status?: string | null
          traffic_level?: string | null
          transmission_type?: string | null
          user_city?: string | null
          user_country?: string | null
          user_latitude?: number | null
          user_longitude?: number | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      routes: {
        Row: {
          activity_level: string
          attachments: Json | null
          best_season: string
          best_times: string
          brand: string | null
          category: Database["public"]["Enums"]["spot_category"] | null
          country: string | null
          created_at: string
          creator_id: string
          description: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          drawing_mode: string | null
          estimated_duration_minutes: number | null
          exercise_media: Json | null
          full_address: string | null
          id: string
          is_enabled: boolean | null
          is_public: boolean
          is_verified: boolean | null
          location: string | null
          media_attachments: Json | null
          metadata: Json
          name: string
          pins: Json[] | null
          region: string | null
          route_type: string | null
          school_id: string | null
          spot_subtype: string
          spot_type: Database["public"]["Enums"]["spot_type"] | null
          status: string | null
          suggested_exercises: string | null
          transmission_type: string
          updated_at: string
          vehicle_types: string[]
          visibility: Database["public"]["Enums"]["spot_visibility"] | null
          waypoint_details: Json[] | null
          waypoints: Json | null
        }
        Insert: {
          activity_level: string
          attachments?: Json | null
          best_season: string
          best_times: string
          brand?: string | null
          category?: Database["public"]["Enums"]["spot_category"] | null
          country?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          drawing_mode?: string | null
          estimated_duration_minutes?: number | null
          exercise_media?: Json | null
          full_address?: string | null
          id?: string
          is_enabled?: boolean | null
          is_public?: boolean
          is_verified?: boolean | null
          location?: string | null
          media_attachments?: Json | null
          metadata?: Json
          name: string
          pins?: Json[] | null
          region?: string | null
          route_type?: string | null
          school_id?: string | null
          spot_subtype: string
          spot_type?: Database["public"]["Enums"]["spot_type"] | null
          status?: string | null
          suggested_exercises?: string | null
          transmission_type: string
          updated_at?: string
          vehicle_types: string[]
          visibility?: Database["public"]["Enums"]["spot_visibility"] | null
          waypoint_details?: Json[] | null
          waypoints?: Json | null
        }
        Update: {
          activity_level?: string
          attachments?: Json | null
          best_season?: string
          best_times?: string
          brand?: string | null
          category?: Database["public"]["Enums"]["spot_category"] | null
          country?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          drawing_mode?: string | null
          estimated_duration_minutes?: number | null
          exercise_media?: Json | null
          full_address?: string | null
          id?: string
          is_enabled?: boolean | null
          is_public?: boolean
          is_verified?: boolean | null
          location?: string | null
          media_attachments?: Json | null
          metadata?: Json
          name?: string
          pins?: Json[] | null
          region?: string | null
          route_type?: string | null
          school_id?: string | null
          spot_subtype?: string
          spot_type?: Database["public"]["Enums"]["spot_type"] | null
          status?: string | null
          suggested_exercises?: string | null
          transmission_type?: string
          updated_at?: string
          vehicle_types?: string[]
          visibility?: Database["public"]["Enums"]["spot_visibility"] | null
          waypoint_details?: Json[] | null
          waypoints?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "routes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_routes: {
        Row: {
          id: string
          route_id: string | null
          saved_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          route_id?: string | null
          saved_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          route_id?: string | null
          saved_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_routes_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_routes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_routes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_routes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_routes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      school_applications: {
        Row: {
          applicant_id: string
          created_at: string
          id: string
          message: string | null
          school_id: string
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          applicant_id: string
          created_at?: string
          id?: string
          message?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          created_at?: string
          id?: string
          message?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_applications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_memberships: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_primary: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          school_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          school_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          school_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_memberships_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      school_routes: {
        Row: {
          created_at: string | null
          id: string
          route_id: string | null
          school_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          route_id?: string | null
          school_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          route_id?: string | null
          school_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_routes_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_routes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          avatar_storage_path: string | null
          avatar_url: string | null
          background_theme: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          country: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          location: string | null
          logo_url: string | null
          name: string
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          student_count: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_storage_path?: string | null
          avatar_url?: string | null
          background_theme?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          student_count?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_storage_path?: string | null
          avatar_url?: string | null
          background_theme?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          student_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      session_exercises: {
        Row: {
          created_at: string | null
          custom_exercise_data: Json | null
          exercise_id: string | null
          exercise_type: string | null
          id: string
          is_completed: boolean | null
          order_in_session: number | null
          session_id: string
        }
        Insert: {
          created_at?: string | null
          custom_exercise_data?: Json | null
          exercise_id?: string | null
          exercise_type?: string | null
          id?: string
          is_completed?: boolean | null
          order_in_session?: number | null
          session_id: string
        }
        Update: {
          created_at?: string | null
          custom_exercise_data?: Json | null
          exercise_id?: string | null
          exercise_type?: string | null
          id?: string
          is_completed?: boolean | null
          order_in_session?: number | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "driving_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      steps: {
        Row: {
          created_at: string
          exercises: string[]
          id: number
          level: string | null
          subtext: Json
          tag: string | null
          title: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          exercises: string[]
          id?: number
          level?: string | null
          subtext: Json
          tag?: string | null
          title: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          exercises?: string[]
          id?: number
          level?: string | null
          subtext?: Json
          tag?: string | null
          title?: Json
          updated_at?: string
        }
        Relationships: []
      }
      student_assignments: {
        Row: {
          assigned_by: string | null
          assignment_type: string | null
          completed_at: string | null
          created_at: string
          due_date: string | null
          feedback: string | null
          id: string
          instructor_id: string | null
          plan_id: string | null
          route_id: string | null
          school_id: string | null
          status: string | null
          student_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assignment_type?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          feedback?: string | null
          id?: string
          instructor_id?: string | null
          plan_id?: string | null
          route_id?: string | null
          school_id?: string | null
          status?: string | null
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assignment_type?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          feedback?: string | null
          id?: string
          instructor_id?: string | null
          plan_id?: string | null
          route_id?: string | null
          school_id?: string | null
          status?: string | null
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_assignments_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assignments_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assignments_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assignments_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assignments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "learning_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assignments_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      student_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          instructor_notes: string | null
          route_id: string | null
          status: string
          student_id: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          instructor_notes?: string | null
          route_id?: string | null
          status: string
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          instructor_notes?: string | null
          route_id?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_progress_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      student_supervisor_relationships: {
        Row: {
          created_at: string | null
          id: string
          status: string | null
          student_id: string
          supervisor_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          status?: string | null
          student_id: string
          supervisor_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          status?: string | null
          student_id?: string
          supervisor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_student_supervisor_relationships_student_id"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_student_supervisor_relationships_student_id"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_student_supervisor_relationships_student_id"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_student_supervisor_relationships_student_id"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_student_supervisor_relationships_supervisor_id"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_student_supervisor_relationships_supervisor_id"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_student_supervisor_relationships_supervisor_id"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_student_supervisor_relationships_supervisor_id"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ssr_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ssr_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ssr_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ssr_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ssr_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ssr_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ssr_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ssr_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          additional_data: Json | null
          campaign_type: Database["public"]["Enums"]["campaign_type_enum"]
          created_at: string | null
          email: string
          id: string
          route_data: Json | null
          submission_type: Database["public"]["Enums"]["submission_type_enum"]
          user_city: string | null
          user_country: string | null
          user_latitude: number | null
          user_longitude: number | null
          user_type: Database["public"]["Enums"]["user_type_enum"]
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          additional_data?: Json | null
          campaign_type?: Database["public"]["Enums"]["campaign_type_enum"]
          created_at?: string | null
          email: string
          id?: string
          route_data?: Json | null
          submission_type?: Database["public"]["Enums"]["submission_type_enum"]
          user_city?: string | null
          user_country?: string | null
          user_latitude?: number | null
          user_longitude?: number | null
          user_type?: Database["public"]["Enums"]["user_type_enum"]
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          additional_data?: Json | null
          campaign_type?: Database["public"]["Enums"]["campaign_type_enum"]
          created_at?: string | null
          email?: string
          id?: string
          route_data?: Json | null
          submission_type?: Database["public"]["Enums"]["submission_type_enum"]
          user_city?: string | null
          user_country?: string | null
          user_latitude?: number | null
          user_longitude?: number | null
          user_type?: Database["public"]["Enums"]["user_type_enum"]
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          apple_product_id: string | null
          billing_interval: string
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price_amount: number
          price_currency: string | null
          stripe_price_id: string | null
          trial_days: number | null
          updated_at: string | null
        }
        Insert: {
          apple_product_id?: string | null
          billing_interval: string
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price_amount: number
          price_currency?: string | null
          stripe_price_id?: string | null
          trial_days?: number | null
          updated_at?: string | null
        }
        Update: {
          apple_product_id?: string | null
          billing_interval?: string
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_amount?: number
          price_currency?: string | null
          stripe_price_id?: string | null
          trial_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      todos: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          metadata: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          metadata?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          metadata?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "todos_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_categories: {
        Row: {
          created_at: string | null
          description_en: string | null
          description_sv: string | null
          icon: string | null
          icon_color: string | null
          id: string
          is_active: boolean
          name_en: string
          name_sv: string
          order_index: number
          requires_auth: boolean
          slug: string
          updated_at: string | null
          user_type: string | null
        }
        Insert: {
          created_at?: string | null
          description_en?: string | null
          description_sv?: string | null
          icon?: string | null
          icon_color?: string | null
          id?: string
          is_active?: boolean
          name_en: string
          name_sv: string
          order_index?: number
          requires_auth?: boolean
          slug: string
          updated_at?: string | null
          user_type?: string | null
        }
        Update: {
          created_at?: string | null
          description_en?: string | null
          description_sv?: string | null
          icon?: string | null
          icon_color?: string | null
          id?: string
          is_active?: boolean
          name_en?: string
          name_sv?: string
          order_index?: number
          requires_auth?: boolean
          slug?: string
          updated_at?: string | null
          user_type?: string | null
        }
        Relationships: []
      }
      translation_overrides: {
        Row: {
          created_at: string
          id: string
          key: string
          language: Database["public"]["Enums"]["supported_language"]
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          language: Database["public"]["Enums"]["supported_language"]
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          language?: Database["public"]["Enums"]["supported_language"]
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      translations: {
        Row: {
          created_at: string | null
          id: string
          key: string
          language: string
          platform: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          language: string
          platform: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          language?: string
          platform?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "translations_language_fkey"
            columns: ["language"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      user_exercise_ratings: {
        Row: {
          comment: string | null
          created_at: string | null
          exercise_id: string
          id: string
          rating: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          exercise_id: string
          id?: string
          rating: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          exercise_id?: string
          id?: string
          rating?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_exercise_ratings_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "user_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      user_exercises: {
        Row: {
          admin_notes: string | null
          bypass_order: boolean | null
          category: string
          completion_count: number | null
          created_at: string | null
          creator_id: string
          custom_media_attachments: Json | null
          description: Json | null
          difficulty_level: string | null
          duration: string | null
          embed_code: string | null
          has_quiz: boolean | null
          icon: string | null
          id: string
          image: string | null
          is_featured: boolean | null
          is_locked: boolean | null
          is_repeat: boolean | null
          is_user_generated: boolean | null
          is_verified: boolean | null
          language_specific_media: boolean | null
          lock_password: string | null
          order_index: number | null
          original_id: string | null
          paywall_enabled: boolean | null
          price_sek: number | null
          price_usd: number | null
          promoted_to_learning_path_id: string | null
          promotion_status: string | null
          quality_score: number | null
          quiz_data: Json | null
          quiz_pass_score: number | null
          quiz_required: boolean | null
          rating: number | null
          rating_count: number | null
          repeat_count: number | null
          repeat_number: number | null
          repetitions: string | null
          report_count: number | null
          tags: string[] | null
          title: Json
          updated_at: string | null
          vehicle_type: string | null
          visibility: string
          youtube_url: string | null
        }
        Insert: {
          admin_notes?: string | null
          bypass_order?: boolean | null
          category?: string
          completion_count?: number | null
          created_at?: string | null
          creator_id: string
          custom_media_attachments?: Json | null
          description?: Json | null
          difficulty_level?: string | null
          duration?: string | null
          embed_code?: string | null
          has_quiz?: boolean | null
          icon?: string | null
          id?: string
          image?: string | null
          is_featured?: boolean | null
          is_locked?: boolean | null
          is_repeat?: boolean | null
          is_user_generated?: boolean | null
          is_verified?: boolean | null
          language_specific_media?: boolean | null
          lock_password?: string | null
          order_index?: number | null
          original_id?: string | null
          paywall_enabled?: boolean | null
          price_sek?: number | null
          price_usd?: number | null
          promoted_to_learning_path_id?: string | null
          promotion_status?: string | null
          quality_score?: number | null
          quiz_data?: Json | null
          quiz_pass_score?: number | null
          quiz_required?: boolean | null
          rating?: number | null
          rating_count?: number | null
          repeat_count?: number | null
          repeat_number?: number | null
          repetitions?: string | null
          report_count?: number | null
          tags?: string[] | null
          title: Json
          updated_at?: string | null
          vehicle_type?: string | null
          visibility?: string
          youtube_url?: string | null
        }
        Update: {
          admin_notes?: string | null
          bypass_order?: boolean | null
          category?: string
          completion_count?: number | null
          created_at?: string | null
          creator_id?: string
          custom_media_attachments?: Json | null
          description?: Json | null
          difficulty_level?: string | null
          duration?: string | null
          embed_code?: string | null
          has_quiz?: boolean | null
          icon?: string | null
          id?: string
          image?: string | null
          is_featured?: boolean | null
          is_locked?: boolean | null
          is_repeat?: boolean | null
          is_user_generated?: boolean | null
          is_verified?: boolean | null
          language_specific_media?: boolean | null
          lock_password?: string | null
          order_index?: number | null
          original_id?: string | null
          paywall_enabled?: boolean | null
          price_sek?: number | null
          price_usd?: number | null
          promoted_to_learning_path_id?: string | null
          promotion_status?: string | null
          quality_score?: number | null
          quiz_data?: Json | null
          quiz_pass_score?: number | null
          quiz_required?: boolean | null
          rating?: number | null
          rating_count?: number | null
          repeat_count?: number | null
          repeat_number?: number | null
          repetitions?: string | null
          report_count?: number | null
          tags?: string[] | null
          title?: Json
          updated_at?: string | null
          vehicle_type?: string | null
          visibility?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_exercises_original_id_fkey"
            columns: ["original_id"]
            isOneToOne: false
            referencedRelation: "user_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      user_payment_methods: {
        Row: {
          brand: string | null
          created_at: string | null
          exp_month: number | null
          exp_year: number | null
          id: string
          is_default: boolean | null
          last_four: string | null
          payment_method_type: string
          stripe_payment_method_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          brand?: string | null
          created_at?: string | null
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_default?: boolean | null
          last_four?: string | null
          payment_method_type: string
          stripe_payment_method_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          brand?: string | null
          created_at?: string | null
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_default?: boolean | null
          last_four?: string | null
          payment_method_type?: string
          stripe_payment_method_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_payments: {
        Row: {
          amount_sek: number | null
          amount_usd: number | null
          created_at: string | null
          currency: string
          exercise_id: string | null
          expires_at: string | null
          id: string
          learning_path_id: string | null
          paid_at: string | null
          payment_method: string | null
          payment_provider_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_sek?: number | null
          amount_usd?: number | null
          created_at?: string | null
          currency?: string
          exercise_id?: string | null
          expires_at?: string | null
          id?: string
          learning_path_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_provider_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_sek?: number | null
          amount_usd?: number | null
          created_at?: string | null
          currency?: string
          exercise_id?: string | null
          expires_at?: string | null
          id?: string
          learning_path_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_provider_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_payments_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "learning_path_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_payments_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      user_push_tokens: {
        Row: {
          created_at: string | null
          device_type: string | null
          id: string
          is_active: boolean | null
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_type?: string | null
          id?: string
          is_active?: boolean | null
          token: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_type?: string | null
          id?: string
          is_active?: boolean | null
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      user_quiz_statistics: {
        Row: {
          best_score_percentage: number | null
          best_streak: number | null
          created_at: string | null
          current_streak: number | null
          exercise_id: string
          first_attempt_at: string | null
          first_passed_at: string | null
          id: string
          latest_attempt_at: string | null
          latest_score_percentage: number | null
          times_failed: number | null
          times_passed: number | null
          total_attempts: number | null
          total_completions: number | null
          total_time_spent_seconds: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          best_score_percentage?: number | null
          best_streak?: number | null
          created_at?: string | null
          current_streak?: number | null
          exercise_id: string
          first_attempt_at?: string | null
          first_passed_at?: string | null
          id?: string
          latest_attempt_at?: string | null
          latest_score_percentage?: number | null
          times_failed?: number | null
          times_passed?: number | null
          total_attempts?: number | null
          total_completions?: number | null
          total_time_spent_seconds?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          best_score_percentage?: number | null
          best_streak?: number | null
          created_at?: string | null
          current_streak?: number | null
          exercise_id?: string
          first_attempt_at?: string | null
          first_passed_at?: string | null
          id?: string
          latest_attempt_at?: string | null
          latest_score_percentage?: number | null
          times_failed?: number | null
          times_passed?: number | null
          total_attempts?: number | null
          total_completions?: number | null
          total_time_spent_seconds?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_quiz_submissions: {
        Row: {
          exercise_id: string
          id: string
          is_correct: boolean | null
          points_earned: number | null
          question_id: string
          selected_answers: string[] | null
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          exercise_id: string
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id: string
          selected_answers?: string[] | null
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          exercise_id?: string
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string
          selected_answers?: string[] | null
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quiz_submissions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "learning_path_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quiz_submissions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "exercise_quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          apple_transaction_id: string | null
          cancelled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          status: string
          stripe_subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          apple_transaction_id?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id: string
          status?: string
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          apple_transaction_id?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tour_progress: {
        Row: {
          completed_at: string | null
          completed_tours: string[] | null
          created_at: string | null
          id: string
          last_tour_completed: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_tours?: string[] | null
          created_at?: string | null
          id?: string
          last_tour_completed?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_tours?: string[] | null
          created_at?: string | null
          id?: string
          last_tour_completed?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_unlocked_content: {
        Row: {
          content_id: string
          content_type: string
          id: number
          unlocked_at: string
          user_id: string
        }
        Insert: {
          content_id: string
          content_type: string
          id?: number
          unlocked_at?: string
          user_id: string
        }
        Update: {
          content_id?: string
          content_type?: string
          id?: number
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      virtual_repeat_completions: {
        Row: {
          created_at: string | null
          exercise_id: string
          id: string
          repeat_number: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          exercise_id: string
          id?: string
          repeat_number: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          exercise_id?: string
          id?: string
          repeat_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "virtual_repeat_completions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "learning_path_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      beta_browser_activity: {
        Row: {
          active_days: number | null
          avg_rating: number | null
          browser_id: string | null
          completed_assignments: number | null
          feedback_submitted: number | null
          last_activity: string | null
          total_assignments: number | null
        }
        Relationships: []
      }
      beta_completion_rates: {
        Row: {
          completed_assignments: number | null
          completion_rate: number | null
          role: string | null
          total_assignments: number | null
        }
        Relationships: []
      }
      beta_feedback_summary: {
        Row: {
          avg_rating: number | null
          feedback_count: number | null
          feedback_type: string | null
          first_feedback: string | null
          latest_feedback: string | null
          role: string | null
          with_images: number | null
        }
        Relationships: []
      }
      invitation_details: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          accepted_by_email: string | null
          accepted_by_name: string | null
          created_at: string | null
          email: string | null
          id: string | null
          invited_by: string | null
          invited_by_email: string | null
          invited_by_name: string | null
          inviter_name: string | null
          inviter_role: string | null
          metadata: Json | null
          relationship_type: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "leaderboard_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_view: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string | null
          last_driving_session: string | null
          location: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          total_driving_distance: number | null
          total_driving_sessions: number | null
          total_driving_time: number | null
          total_routes_created: number | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string | null
          last_driving_session?: string | null
          location?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          total_driving_distance?: number | null
          total_driving_sessions?: number | null
          total_driving_time?: number | null
          total_routes_created?: number | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string | null
          last_driving_session?: string | null
          location?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          total_driving_distance?: number | null
          total_driving_sessions?: number | null
          total_driving_time?: number | null
          total_routes_created?: number | null
        }
        Relationships: []
      }
      pricing_preferences_analytics: {
        Row: {
          avg_custom_price: number | null
          emails_provided: number | null
          language: string | null
          response_count: number | null
          selected_plan: string | null
          survey_date: string | null
        }
        Relationships: []
      }
      pricing_survey_with_feedback: {
        Row: {
          browser_id: string | null
          created_at: string | null
          custom_features: string[] | null
          custom_price: string | null
          feedback_comment: string | null
          feedback_created_at: string | null
          feedback_id: string | null
          feedback_name: string | null
          feedback_rating: number | null
          feedback_type: string | null
          id: string | null
          language: string | null
          metadata: Json | null
          price_motivation: string | null
          selected_features: string[] | null
          selected_plan: string | null
          updated_at: string | null
          user_email: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          email: string | null
          full_name: string | null
          id: string | null
          role: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: []
      }
      user_profiles_view: {
        Row: {
          email: string | null
          full_name: string | null
          id: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          school_ids: string[] | null
          school_roles: Database["public"]["Enums"]["user_role"][] | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_bucket_exists: {
        Args: { bucket_name: string }
        Returns: boolean
      }
      check_invitation_rate_limit: {
        Args: { user_id: string }
        Returns: boolean
      }
      complete_beta_assignment: {
        Args: {
          p_assignment_id: string
          p_browser_id: string
          p_completed?: boolean
        }
        Returns: boolean
      }
      convert_beta_signup_to_user: {
        Args: { role_type?: string; signup_id: string }
        Returns: string
      }
      convert_submission_to_route: {
        Args: { submission_id: string }
        Returns: string
      }
      create_media_table: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_notification: {
        Args: {
          p_actor_id: string
          p_message: string
          p_metadata?: Json
          p_target_id?: string
          p_type: Database["public"]["Enums"]["notification_type"]
          p_user_id: string
        }
        Returns: string
      }
      current_user_email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      expire_old_invitations: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      find_nearby_routes: {
        Args: { lat_input: number; lng_input: number; max_km?: number }
        Returns: {
          activity_level: string
          attachments: Json | null
          best_season: string
          best_times: string
          brand: string | null
          category: Database["public"]["Enums"]["spot_category"] | null
          country: string | null
          created_at: string
          creator_id: string
          description: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          drawing_mode: string | null
          estimated_duration_minutes: number | null
          exercise_media: Json | null
          full_address: string | null
          id: string
          is_enabled: boolean | null
          is_public: boolean
          is_verified: boolean | null
          location: string | null
          media_attachments: Json | null
          metadata: Json
          name: string
          pins: Json[] | null
          region: string | null
          route_type: string | null
          school_id: string | null
          spot_subtype: string
          spot_type: Database["public"]["Enums"]["spot_type"] | null
          status: string | null
          suggested_exercises: string | null
          transmission_type: string
          updated_at: string
          vehicle_types: string[]
          visibility: Database["public"]["Enums"]["spot_visibility"] | null
          waypoint_details: Json[] | null
          waypoints: Json | null
        }[]
      }
      fix_school_memberships_query: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_available_tour_categories: {
        Args: { user_authenticated?: boolean; user_type_param?: string }
        Returns: {
          description_en: string
          description_sv: string
          icon: string
          icon_color: string
          id: string
          name_en: string
          name_sv: string
          order_index: number
          slug: string
          step_count: number
        }[]
      }
      get_beta_test_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          avg_rating: number
          completed_assignments: number
          completion_rate: number
          feedback_by_type: Json
          total_assignments: number
          total_browsers: number
          total_feedback: number
        }[]
      }
      get_feature_popularity: {
        Args: Record<PropertyKey, never>
        Returns: {
          feature_name: string
          feature_type: string
          percentage: number
          selection_count: number
        }[]
      }
      get_next_occurrence_date: {
        Args: {
          base_date: string
          recurrence_pattern: string
          recurrence_rule?: Json
        }
        Returns: string
      }
      get_or_create_direct_conversation: {
        Args: { user1_id: string; user2_id: string }
        Returns: string
      }
      get_route_filters: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_storage_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_tour_steps_by_category: {
        Args: {
          category_slug_param: string
          user_authenticated?: boolean
          user_type_param?: string
        }
        Returns: {
          body: Json
          category_name_en: string
          category_name_sv: string
          category_slug: string
          icon: string
          icon_color: string
          id: string
          key: string
          order_index: number
          target: string
          title: Json
        }[]
      }
      get_user_active_subscription: {
        Args: { user_uuid: string }
        Returns: {
          current_period_end: string
          plan_name: string
          plan_price: number
          status: string
          subscription_id: string
        }[]
      }
      get_user_best_quiz_score: {
        Args: { p_exercise_id: string; p_user_id: string }
        Returns: {
          best_attempt_date: string
          best_score: number
          times_passed: number
          total_attempts: number
        }[]
      }
      get_user_invitation_summary: {
        Args: { user_id: string }
        Returns: {
          accepted_received: number
          accepted_sent: number
          pending_received: number
          pending_sent: number
          received_invitations_count: number
          sent_invitations_count: number
        }[]
      }
      get_user_payment_summary: {
        Args: { user_uuid: string }
        Returns: {
          has_active_subscription: boolean
          last_payment_date: string
          payment_count: number
          total_spent: number
        }[]
      }
      get_user_preferences_by_email: {
        Args: { user_email_param: string }
        Returns: {
          all_features: string[]
          custom_features: string[]
          custom_price: string
          feedback_count: number
          latest_feedback_comment: string
          latest_feedback_rating: number
          price_motivation: string
          selected_plan: string
          standard_features: string[]
          survey_created_at: string
          survey_id: string
        }[]
      }
      get_user_quiz_history: {
        Args: { p_exercise_id: string; p_user_id: string }
        Returns: {
          attempt_id: string
          attempt_number: number
          completed_at: string
          passed: boolean
          score_percentage: number
          time_spent_seconds: number
        }[]
      }
      get_user_school_memberships: {
        Args: { user_id: string }
        Returns: string[]
      }
      get_user_supervisor_details: {
        Args: { target_user_id: string }
        Returns: {
          supervisor_email: string
          supervisor_id: string
          supervisor_name: string
        }[]
      }
      get_user_upcoming_sessions: {
        Args: { user_uuid: string }
        Returns: {
          description: string
          end_time: string
          location_name: string
          session_id: string
          session_type: string
          start_time: string
          status: string
          title: string
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      has_school_role: {
        Args: {
          school: string
          target_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      insert_media_item: {
        Args: {
          alt_text_param: Json
          category_param: string
          filename_param: string
          url_param: string
        }
        Returns: undefined
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_instructor_in_school: {
        Args: { target_school_id: string }
        Returns: boolean
      }
      is_recurring_event: {
        Args: { event_row: Database["public"]["Tables"]["events"]["Row"] }
        Returns: boolean
      }
      is_school_admin: {
        Args: { school_id: string }
        Returns: boolean
      }
      is_school_member: {
        Args: { school_id: string }
        Returns: boolean
      }
      leave_school: {
        Args: { school_id_to_leave: string }
        Returns: boolean
      }
      leave_supervisor: {
        Args: { supervisor_id_to_leave: string }
        Returns: boolean
      }
      migrate_translations_to_content: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      reset_all_user_tours: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      reset_user_tour: {
        Args: { tour_type_param: string; user_id_param: string }
        Returns: boolean
      }
      send_message: {
        Args: {
          p_content: string
          p_conversation_id: string
          p_message_type?: string
          p_metadata?: Json
          p_sender_id: string
        }
        Returns: string
      }
      send_push_notification: {
        Args: {
          p_action_url?: string
          p_data?: Json
          p_message: string
          p_priority?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      send_user_invitation: {
        Args: {
          supervisor_id?: string
          supervisor_name?: string
          user_email: string
          user_role?: Database["public"]["Enums"]["user_role"]
        }
        Returns: Json
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      should_show_tour_updates: {
        Args: { tour_type_param: string; user_id_param: string }
        Returns: boolean
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      supervisor_mark_exercise_complete: {
        Args: {
          exercise_id_param: string
          repeat_number_param?: number
          student_id_param: string
        }
        Returns: boolean
      }
      supervisor_unmark_exercise_complete: {
        Args: {
          exercise_id_param: string
          repeat_number_param?: number
          student_id_param: string
        }
        Returns: boolean
      }
      user_can_access_exercise: {
        Args: { target_exercise_id: string; target_user_id: string }
        Returns: boolean
      }
      user_can_access_path: {
        Args: { target_path_id: string; target_user_id: string }
        Returns: boolean
      }
      user_has_paid_for_exercise: {
        Args: { target_exercise_id: string; target_user_id: string }
        Returns: boolean
      }
      user_has_paid_for_path: {
        Args: { target_path_id: string; target_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      application_status: "pending" | "approved" | "rejected"
      campaign_type:
        | "beta-student-lund"
        | "beta-handledare-lund"
        | "beta-körskola-lund"
        | "survey-student-lund"
        | "survey-handledare-lund"
        | "survey-körskola-lund"
        | "submit-route-lund"
        | "none"
      campaign_type_enum:
        | "beta-student-lund"
        | "beta-handledare-lund"
        | "beta-körskola-lund"
        | "organic"
        | "direct"
        | "qr"
        | "print"
        | "submit-route-organic"
        | "none"
        | "supervisor-organic"
      conversation_type: "direct" | "group"
      difficulty_level: "beginner" | "intermediate" | "advanced"
      experience_level: "beginner" | "intermediate" | "advanced"
      invite_status: "pending" | "accepted" | "declined"
      language: "sv" | "en"
      location_type: "saved" | "generated"
      message_type: "text" | "image" | "file"
      notification_type:
        | "route_reviewed"
        | "route_driven"
        | "route_saved"
        | "follow_new_route"
        | "follow_drove_route"
        | "follow_saved_route"
        | "new_follower"
        | "new_message"
        | "student_invitation"
        | "supervisor_invitation"
        | "route_created"
        | "event_invitation"
        | "event_updated"
        | "event_invite"
      report_type:
        | "spam"
        | "harmful_content"
        | "privacy_issue"
        | "other"
        | "incorrect_information"
        | "inappropriate"
        | "impersonation"
        | "inappropriate_profile"
        | "underage"
      reportable_type: "route" | "comment" | "review" | "user"
      review_difficulty: "beginner" | "intermediate" | "advanced"
      spot_category:
        | "parking"
        | "roundabout"
        | "incline_start"
        | "straight_driving"
        | "reversing"
        | "highway_entry_exit"
      spot_type: "urban" | "rural" | "highway" | "residential"
      spot_visibility: "public" | "private" | "school_only"
      submission_type: "beta" | "survey" | "route" | "ambassador"
      submission_type_enum:
        | "beta"
        | "contact"
        | "route"
        | "ambassador"
        | "supervisor"
      supported_language: "en" | "sv"
      user_role: "student" | "school" | "instructor" | "admin" | "teacher"
      user_type: "student" | "handledare" | "körskola"
      user_type_enum:
        | "student"
        | "instructor"
        | "school"
        | "other"
        | "handledare"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      application_status: ["pending", "approved", "rejected"],
      campaign_type: [
        "beta-student-lund",
        "beta-handledare-lund",
        "beta-körskola-lund",
        "survey-student-lund",
        "survey-handledare-lund",
        "survey-körskola-lund",
        "submit-route-lund",
        "none",
      ],
      campaign_type_enum: [
        "beta-student-lund",
        "beta-handledare-lund",
        "beta-körskola-lund",
        "organic",
        "direct",
        "qr",
        "print",
        "submit-route-organic",
        "none",
        "supervisor-organic",
      ],
      conversation_type: ["direct", "group"],
      difficulty_level: ["beginner", "intermediate", "advanced"],
      experience_level: ["beginner", "intermediate", "advanced"],
      invite_status: ["pending", "accepted", "declined"],
      language: ["sv", "en"],
      location_type: ["saved", "generated"],
      message_type: ["text", "image", "file"],
      notification_type: [
        "route_reviewed",
        "route_driven",
        "route_saved",
        "follow_new_route",
        "follow_drove_route",
        "follow_saved_route",
        "new_follower",
        "new_message",
        "student_invitation",
        "supervisor_invitation",
        "route_created",
        "event_invitation",
        "event_updated",
        "event_invite",
      ],
      report_type: [
        "spam",
        "harmful_content",
        "privacy_issue",
        "other",
        "incorrect_information",
        "inappropriate",
        "impersonation",
        "inappropriate_profile",
        "underage",
      ],
      reportable_type: ["route", "comment", "review", "user"],
      review_difficulty: ["beginner", "intermediate", "advanced"],
      spot_category: [
        "parking",
        "roundabout",
        "incline_start",
        "straight_driving",
        "reversing",
        "highway_entry_exit",
      ],
      spot_type: ["urban", "rural", "highway", "residential"],
      spot_visibility: ["public", "private", "school_only"],
      submission_type: ["beta", "survey", "route", "ambassador"],
      submission_type_enum: [
        "beta",
        "contact",
        "route",
        "ambassador",
        "supervisor",
      ],
      supported_language: ["en", "sv"],
      user_role: ["student", "school", "instructor", "admin", "teacher"],
      user_type: ["student", "handledare", "körskola"],
      user_type_enum: [
        "student",
        "instructor",
        "school",
        "other",
        "handledare",
      ],
    },
  },
} as const

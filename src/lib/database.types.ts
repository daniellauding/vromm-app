export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
            referencedRelation: "profiles"
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
            referencedRelation: "profiles"
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birthdate: string | null
          created_at: string
          experience_level:
            | Database["public"]["Enums"]["experience_level"]
            | null
          full_name: string
          id: string
          location: string
          location_lat: number | null
          location_lng: number | null
          organization_number: string | null
          private_profile: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          birthdate?: string | null
          created_at?: string
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          full_name: string
          id: string
          location: string
          location_lat?: number | null
          location_lng?: number | null
          organization_number?: string | null
          private_profile?: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          birthdate?: string | null
          created_at?: string
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          full_name?: string
          id?: string
          location?: string
          location_lat?: number | null
          location_lng?: number | null
          organization_number?: string | null
          private_profile?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
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
            referencedRelation: "profiles"
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      route_exercise_completions: {
        Row: {
          completed_at: string | null
          exercise_id: string
          id: string
          route_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          exercise_id: string
          id?: string
          route_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          exercise_id?: string
          id?: string
          route_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_exercise_completions_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_exercise_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          full_address: string | null
          id: string
          is_public: boolean
          media_attachments: Json | null
          metadata: Json
          name: string
          pins: Json[] | null
          region: string | null
          route_type: string | null
          spot_subtype: string
          spot_type: Database["public"]["Enums"]["spot_type"] | null
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
          full_address?: string | null
          id?: string
          is_public?: boolean
          media_attachments?: Json | null
          metadata?: Json
          name: string
          pins?: Json[] | null
          region?: string | null
          route_type?: string | null
          spot_subtype: string
          spot_type?: Database["public"]["Enums"]["spot_type"] | null
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
          full_address?: string | null
          id?: string
          is_public?: boolean
          media_attachments?: Json | null
          metadata?: Json
          name?: string
          pins?: Json[] | null
          region?: string | null
          route_type?: string | null
          spot_subtype?: string
          spot_type?: Database["public"]["Enums"]["spot_type"] | null
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
            referencedRelation: "profiles"
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
            referencedRelation: "profiles"
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
            referencedRelation: "profiles"
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
          id: string
          is_primary: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          school_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          school_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_slides: {
        Row: {
          id: string
          title_en: string
          title_sv: string
          text_en: string
          text_sv: string
          image_url: string | null
          icon: string | null
          icon_color: string | null
          order: number
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title_en: string
          title_sv: string
          text_en: string
          text_sv: string
          image_url?: string | null
          icon?: string | null
          icon_color?: string | null
          order?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title_en?: string
          title_sv?: string
          text_en?: string
          text_sv?: string
          image_url?: string | null
          icon?: string | null
          icon_color?: string | null
          order?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      school_admin_memberships: {
        Row: {
          school_id: string | null
          user_id: string | null
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      gtrgm_compress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_in: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      gtrgm_options: {
        Args: {
          "": unknown
        }
        Returns: undefined
      }
      gtrgm_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      set_limit: {
        Args: {
          "": number
        }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: {
          "": string
        }
        Returns: string[]
      }
    }
    Enums: {
      application_status: "pending" | "approved" | "rejected"
      difficulty_level: "beginner" | "intermediate" | "advanced"
      experience_level: "beginner" | "intermediate" | "advanced"
      invite_status: "pending" | "accepted" | "declined"
      location_type: "saved" | "generated"
      report_type: "spam" | "harmful_content" | "privacy_issue" | "other"
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
      user_role: "student" | "school" | "instructor" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

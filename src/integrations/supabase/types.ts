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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      alert_notifications: {
        Row: {
          alert_id: string
          contact_name: string
          contact_phone: string
          created_at: string
          id: string
          notified_at: string
          viewed_at: string | null
        }
        Insert: {
          alert_id: string
          contact_name: string
          contact_phone: string
          created_at?: string
          id?: string
          notified_at?: string
          viewed_at?: string | null
        }
        Update: {
          alert_id?: string
          contact_name?: string
          contact_phone?: string
          created_at?: string
          id?: string
          notified_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_notifications_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "emergency_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_alerts: {
        Row: {
          created_at: string | null
          emergency_type: string
          evidence_files: Json | null
          id: string
          latitude: number
          longitude: number
          resolved_at: string | null
          situation: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emergency_type: string
          evidence_files?: Json | null
          id?: string
          latitude: number
          longitude: number
          resolved_at?: string | null
          situation: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          emergency_type?: string
          evidence_files?: Json | null
          id?: string
          latitude?: number
          longitude?: number
          resolved_at?: string | null
          situation?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      emergency_messages: {
        Row: {
          alert_id: string
          created_at: string
          id: string
          message: string
          sender_id: string
          sender_name: string
        }
        Insert: {
          alert_id: string
          created_at?: string
          id?: string
          message: string
          sender_id: string
          sender_name: string
        }
        Update: {
          alert_id?: string
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          sender_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_messages_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "emergency_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_services: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          id: string
          is_national: boolean | null
          latitude: number
          longitude: number
          name: string
          phone: string
          type: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          is_national?: boolean | null
          latitude: number
          longitude: number
          name: string
          phone: string
          type: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          is_national?: boolean | null
          latitude?: number
          longitude?: number
          name?: string
          phone?: string
          type?: string
        }
        Relationships: []
      }
      pending_emergency_services: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          id: string
          latitude: number
          longitude: number
          name: string
          phone: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string
          type: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          latitude: number
          longitude: number
          name: string
          phone: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by: string
          type: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          phone?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string
          type?: string
        }
        Relationships: []
      }
      personal_contacts: {
        Row: {
          created_at: string | null
          id: string
          name: string
          phone: string
          relationship: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          phone: string
          relationship?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          phone?: string
          relationship?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          allergies: string | null
          blood_type: string | null
          created_at: string | null
          emergency_notes: string | null
          full_name: string | null
          id: string
          medical_conditions: string | null
          phone_number: string | null
          profile_picture: string | null
          updated_at: string | null
        }
        Insert: {
          allergies?: string | null
          blood_type?: string | null
          created_at?: string | null
          emergency_notes?: string | null
          full_name?: string | null
          id: string
          medical_conditions?: string | null
          phone_number?: string | null
          profile_picture?: string | null
          updated_at?: string | null
        }
        Update: {
          allergies?: string | null
          blood_type?: string | null
          created_at?: string | null
          emergency_notes?: string | null
          full_name?: string | null
          id?: string
          medical_conditions?: string | null
          phone_number?: string | null
          profile_picture?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const

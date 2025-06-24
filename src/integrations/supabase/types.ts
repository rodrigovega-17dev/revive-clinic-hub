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
      appointments: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          end_time: string
          google_calendar_event_id: string | null
          id: string
          notes: string | null
          payment_amount: number | null
          payment_date: string | null
          payment_method: string | null
          payment_status: string | null
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"]
          therapist_id: string
          treatment_id: string | null
          updated_at: string
          sync_status: string | null
          last_synced_at: string | null
          sync_error_message: string | null
          google_calendar_version: string | null
          local_version: number | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          end_time: string
          google_calendar_event_id?: string | null
          id?: string
          notes?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"]
          therapist_id: string
          treatment_id?: string | null
          updated_at?: string
          sync_status?: string | null
          last_synced_at?: string | null
          sync_error_message?: string | null
          google_calendar_version?: string | null
          local_version?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          end_time?: string
          google_calendar_event_id?: string | null
          id?: string
          notes?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          therapist_id?: string
          treatment_id?: string | null
          updated_at?: string
          sync_status?: string | null
          last_synced_at?: string | null
          sync_error_message?: string | null
          google_calendar_version?: string | null
          local_version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          birth_date: string | null
          charge_amount: number | null
          created_at: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          is_active: boolean
          last_name: string
          medical_notes: string | null
          phone: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          charge_amount?: number | null
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          is_active?: boolean
          last_name: string
          medical_notes?: string | null
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          charge_amount?: number | null
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          is_active?: boolean
          last_name?: string
          medical_notes?: string | null
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      daily_cash_summary: {
        Row: {
          cash_payments: number | null
          closing_cash: number | null
          created_at: string
          date: string
          id: string
          opening_cash: number | null
          total_expenses: number | null
          total_revenue: number | null
          updated_at: string
        }
        Insert: {
          cash_payments?: number | null
          closing_cash?: number | null
          created_at?: string
          date: string
          id?: string
          opening_cash?: number | null
          total_expenses?: number | null
          total_revenue?: number | null
          updated_at?: string
        }
        Update: {
          cash_payments?: number | null
          closing_cash?: number | null
          created_at?: string
          date?: string
          id?: string
          opening_cash?: number | null
          total_expenses?: number | null
          total_revenue?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          date: string
          description: string
          id: string
          recorded_by: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          date: string
          description: string
          id?: string
          recorded_by?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          date?: string
          description?: string
          id?: string
          recorded_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          appointment_id: string | null
          client_id: string | null
          created_at: string
          description: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          payment_date: string
          received_by: string | null
          shift_id: string | null
          facturado: boolean | null
          iva_amount: number | null
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          payment_date?: string
          received_by?: string | null
          shift_id?: string | null
          facturado?: boolean | null
          iva_amount?: number | null
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          payment_date?: string
          received_by?: string | null
          shift_id?: string | null
          facturado?: boolean | null
          iva_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id: string
          is_active?: boolean
          last_name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      shifts: {
        Row: {
          closing_amount: number | null
          created_at: string
          end_time: string | null
          id: string
          is_closed: boolean
          notes: string | null
          opening_amount: number
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          closing_amount?: number | null
          created_at?: string
          end_time?: string | null
          id?: string
          is_closed?: boolean
          notes?: string | null
          opening_amount?: number
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          closing_amount?: number | null
          created_at?: string
          end_time?: string | null
          id?: string
          is_closed?: boolean
          notes?: string | null
          opening_amount?: number
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          products_provided: string[] | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          products_provided?: string[] | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          products_provided?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      therapists: {
        Row: {
          created_at: string
          first_name: string | null
          google_calendar_id: string | null
          id: string
          is_active: boolean
          last_name: string | null
          license_number: string | null
          specialties: string[] | null
          updated_at: string
          user_id: string | null
          commission_percentage: number | null
          calendar_color_id: string | null
          email: string | null
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          google_calendar_id?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          license_number?: string | null
          specialties?: string[] | null
          updated_at?: string
          user_id?: string | null
          commission_percentage?: number | null
          calendar_color_id?: string | null
          email?: string | null
        }
        Update: {
          created_at?: string
          first_name?: string | null
          google_calendar_id?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          license_number?: string | null
          specialties?: string[] | null
          updated_at?: string
          user_id?: string | null
          commission_percentage?: number | null
          calendar_color_id?: string | null
          email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "therapists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      treatments: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name: string
          price?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          id: string
          appointment_id: string | null
          old_status: string | null
          new_status: string | null
          changed_at: string | null
          error_message: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          appointment_id?: string | null
          old_status?: string | null
          new_status?: string | null
          changed_at?: string | null
          error_message?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          appointment_id?: string | null
          old_status?: string | null
          new_status?: string | null
          changed_at?: string | null
          error_message?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_therapist_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      appointment_status: "scheduled" | "completed" | "cancelled" | "no_show"
      gender: "male" | "female" | "other" | "prefer_not_to_say"
      payment_method: "cash" | "card" | "transfer" | "insurance"
      user_role: "admin" | "therapist" | "reception"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appointment_status: ["scheduled", "completed", "cancelled", "no_show"],
      gender: ["male", "female", "other", "prefer_not_to_say"],
      payment_method: ["cash", "card", "transfer", "insurance"],
      user_role: ["admin", "therapist", "reception"],
    },
  },
} as const

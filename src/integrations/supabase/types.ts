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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action_type: string
          clinic_id: string
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          clinic_id: string
          created_at?: string
          description: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          clinic_id?: string
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_jobs: {
        Row: {
          clinic_id: string
          conversation_id: string
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          request_message_id: string | null
          response_message_id: string | null
          started_at: string | null
          status: string
          tool_calls: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          clinic_id: string
          conversation_id: string
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          request_message_id?: string | null
          response_message_id?: string | null
          started_at?: string | null
          status: string
          tool_calls?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          clinic_id?: string
          conversation_id?: string
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          request_message_id?: string | null
          response_message_id?: string | null
          started_at?: string | null
          status?: string
          tool_calls?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_jobs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_jobs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_jobs_request_message_id_fkey"
            columns: ["request_message_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_jobs_response_message_id_fkey"
            columns: ["response_message_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_messages: {
        Row: {
          clinic_id: string
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          tool_calls: Json | null
          user_id: string
        }
        Insert: {
          clinic_id: string
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          tool_calls?: Json | null
          user_id: string
        }
        Update: {
          clinic_id?: string
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          tool_calls?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_clinic_memory: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string | null
          fact: string
          id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by?: string | null
          fact: string
          id?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          fact?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_clinic_memory_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_clinic_memory_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          client_id: string
          clinic_id: string
          created_at: string | null
          end_time: string
          google_calendar_event_id: string | null
          google_calendar_version: string | null
          id: string
          last_synced_at: string | null
          local_version: number | null
          notes: string | null
          pay_therapist_in_full: boolean
          payment_amount: number | null
          payment_date: string | null
          payment_method: string | null
          payment_status: string | null
          payroll_commission_percentage: number | null
          payroll_compensation_type: string | null
          payroll_fixed_session_amount: number | null
          payroll_incentive_enabled: boolean | null
          payroll_incentive_fixed_bonus: number | null
          payroll_incentive_percentage_bonus: number | null
          payroll_incentive_threshold_sessions: number | null
          payroll_retention_enabled: boolean | null
          payroll_retention_rate: number | null
          payroll_snapshot_at: string | null
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"] | null
          sync_error_message: string | null
          sync_status: string | null
          therapist_id: string
          treatment_id: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          clinic_id: string
          created_at?: string | null
          end_time: string
          google_calendar_event_id?: string | null
          google_calendar_version?: string | null
          id?: string
          last_synced_at?: string | null
          local_version?: number | null
          notes?: string | null
          pay_therapist_in_full?: boolean
          payment_amount?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          payroll_commission_percentage?: number | null
          payroll_compensation_type?: string | null
          payroll_fixed_session_amount?: number | null
          payroll_incentive_enabled?: boolean | null
          payroll_incentive_fixed_bonus?: number | null
          payroll_incentive_percentage_bonus?: number | null
          payroll_incentive_threshold_sessions?: number | null
          payroll_retention_enabled?: boolean | null
          payroll_retention_rate?: number | null
          payroll_snapshot_at?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          sync_error_message?: string | null
          sync_status?: string | null
          therapist_id: string
          treatment_id?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          clinic_id?: string
          created_at?: string | null
          end_time?: string
          google_calendar_event_id?: string | null
          google_calendar_version?: string | null
          id?: string
          last_synced_at?: string | null
          local_version?: number | null
          notes?: string | null
          pay_therapist_in_full?: boolean
          payment_amount?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          payroll_commission_percentage?: number | null
          payroll_compensation_type?: string | null
          payroll_fixed_session_amount?: number | null
          payroll_incentive_enabled?: boolean | null
          payroll_incentive_fixed_bonus?: number | null
          payroll_incentive_percentage_bonus?: number | null
          payroll_incentive_threshold_sessions?: number | null
          payroll_retention_enabled?: boolean | null
          payroll_retention_rate?: number | null
          payroll_snapshot_at?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          sync_error_message?: string | null
          sync_status?: string | null
          therapist_id?: string
          treatment_id?: string | null
          updated_at?: string | null
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
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
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
      cfdi_invoice_payments: {
        Row: {
          amount: number
          cfdi_invoice_id: string
          created_at: string | null
          id: string
          payment_id: string
        }
        Insert: {
          amount: number
          cfdi_invoice_id: string
          created_at?: string | null
          id?: string
          payment_id: string
        }
        Update: {
          amount?: number
          cfdi_invoice_id?: string
          created_at?: string | null
          id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cfdi_invoice_payments_cfdi_invoice_id_fkey"
            columns: ["cfdi_invoice_id"]
            isOneToOne: false
            referencedRelation: "cfdi_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cfdi_invoice_payments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      cfdi_invoices: {
        Row: {
          canceled_at: string | null
          clinic_id: string
          created_at: string | null
          currency: string | null
          emitted_at: string | null
          facturapi_id: string | null
          folio: string | null
          global_period_end: string | null
          global_period_start: string | null
          id: string
          pdf_url: string | null
          raw_response: Json | null
          related_cfdi_id: string | null
          source: string | null
          status: Database["public"]["Enums"]["cfdi_status"]
          subtotal: number
          tax: number
          total: number
          type: Database["public"]["Enums"]["cfdi_type"]
          updated_at: string | null
          uuid: string | null
          xml_url: string | null
        }
        Insert: {
          canceled_at?: string | null
          clinic_id: string
          created_at?: string | null
          currency?: string | null
          emitted_at?: string | null
          facturapi_id?: string | null
          folio?: string | null
          global_period_end?: string | null
          global_period_start?: string | null
          id?: string
          pdf_url?: string | null
          raw_response?: Json | null
          related_cfdi_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["cfdi_status"]
          subtotal?: number
          tax?: number
          total?: number
          type: Database["public"]["Enums"]["cfdi_type"]
          updated_at?: string | null
          uuid?: string | null
          xml_url?: string | null
        }
        Update: {
          canceled_at?: string | null
          clinic_id?: string
          created_at?: string | null
          currency?: string | null
          emitted_at?: string | null
          facturapi_id?: string | null
          folio?: string | null
          global_period_end?: string | null
          global_period_start?: string | null
          id?: string
          pdf_url?: string | null
          raw_response?: Json | null
          related_cfdi_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["cfdi_status"]
          subtotal?: number
          tax?: number
          total?: number
          type?: Database["public"]["Enums"]["cfdi_type"]
          updated_at?: string | null
          uuid?: string | null
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cfdi_invoices_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cfdi_invoices_related_cfdi_id_fkey"
            columns: ["related_cfdi_id"]
            isOneToOne: false
            referencedRelation: "cfdi_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          archived: boolean
          birth_date: string | null
          cfdi_email: string | null
          cfdi_use: string | null
          charge_amount: number | null
          clinic_id: string
          created_at: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          facturapi_customer_id: string | null
          first_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          is_active: boolean | null
          last_name: string
          medical_notes: string | null
          pay_therapist_in_full: boolean
          phone: string | null
          rfc: string | null
          tax_regime: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          archived?: boolean
          birth_date?: string | null
          cfdi_email?: string | null
          cfdi_use?: string | null
          charge_amount?: number | null
          clinic_id: string
          created_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          facturapi_customer_id?: string | null
          first_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          is_active?: boolean | null
          last_name: string
          medical_notes?: string | null
          pay_therapist_in_full?: boolean
          phone?: string | null
          rfc?: string | null
          tax_regime?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          archived?: boolean
          birth_date?: string | null
          cfdi_email?: string | null
          cfdi_use?: string | null
          charge_amount?: number | null
          clinic_id?: string
          created_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          facturapi_customer_id?: string | null
          first_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          is_active?: boolean | null
          last_name?: string
          medical_notes?: string | null
          pay_therapist_in_full?: boolean
          phone?: string | null
          rfc?: string | null
          tax_regime?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          clinic_id: string
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          clinic_id: string
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          clinic_id?: string
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_subscriptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          created_at: string
          currency: string | null
          email: string | null
          facturapi_live_secret: string | null
          facturapi_test_secret: string | null
          facturapi_use_live: boolean | null
          facturapi_webhook_secret: string | null
          google_calendar_auth: Json | null
          google_calendar_enabled: boolean | null
          google_calendar_selected_id: string | null
          google_calendar_sync_settings: Json | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          phone: string | null
          settings: Json | null
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_plan_id: string | null
          subscription_status: string | null
          timezone: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          facturapi_live_secret?: string | null
          facturapi_test_secret?: string | null
          facturapi_use_live?: boolean | null
          facturapi_webhook_secret?: string | null
          google_calendar_auth?: Json | null
          google_calendar_enabled?: boolean | null
          google_calendar_selected_id?: string | null
          google_calendar_sync_settings?: Json | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
          settings?: Json | null
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_plan_id?: string | null
          subscription_status?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          facturapi_live_secret?: string | null
          facturapi_test_secret?: string | null
          facturapi_use_live?: boolean | null
          facturapi_webhook_secret?: string | null
          google_calendar_auth?: Json | null
          google_calendar_enabled?: boolean | null
          google_calendar_selected_id?: string | null
          google_calendar_sync_settings?: Json | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          settings?: Json | null
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_plan_id?: string | null
          subscription_status?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      daily_cash_summary: {
        Row: {
          cash_payments: number | null
          clinic_id: string
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
          clinic_id: string
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
          clinic_id?: string
          closing_cash?: number | null
          created_at?: string
          date?: string
          id?: string
          opening_cash?: number | null
          total_expenses?: number | null
          total_revenue?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_cash_summary_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      document_instances: {
        Row: {
          appointment_id: string | null
          client_id: string
          clinic_id: string
          created_at: string
          created_by: string | null
          data: Json
          finalized_at: string | null
          id: string
          rendered_pdf_url: string | null
          responsible_person_id: string | null
          responsible_person_type: string | null
          share_token: string | null
          status: string
          template_id: string
          template_version: number
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          client_id: string
          clinic_id: string
          created_at?: string
          created_by?: string | null
          data: Json
          finalized_at?: string | null
          id?: string
          rendered_pdf_url?: string | null
          responsible_person_id?: string | null
          responsible_person_type?: string | null
          share_token?: string | null
          status?: string
          template_id: string
          template_version: number
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          client_id?: string
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          data?: Json
          finalized_at?: string | null
          id?: string
          rendered_pdf_url?: string | null
          responsible_person_id?: string | null
          responsible_person_type?: string | null
          share_token?: string | null
          status?: string
          template_id?: string
          template_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_instances_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_instances_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_instances_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_instances_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          category: string | null
          clinic_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          language: string
          name: string
          schema: Json
          slug: string
          type: string
          updated_at: string
          version: number
        }
        Insert: {
          category?: string | null
          clinic_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          language?: string
          name: string
          schema: Json
          slug: string
          type: string
          updated_at?: string
          version?: number
        }
        Update: {
          category?: string | null
          clinic_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          language?: string
          name?: string
          schema?: Json
          slug?: string
          type?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          clinic_id: string
          created_at: string | null
          date: string
          description: string
          id: string
          payment_method: string
          recorded_by: string | null
          supplier_id: string | null
          therapist_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          clinic_id: string
          created_at?: string | null
          date: string
          description: string
          id?: string
          payment_method?: string
          recorded_by?: string | null
          supplier_id?: string | null
          therapist_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          clinic_id?: string
          created_at?: string | null
          date?: string
          description?: string
          id?: string
          payment_method?: string
          recorded_by?: string | null
          supplier_id?: string | null
          therapist_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          appointment_id: string | null
          client_id: string | null
          clinic_id: string
          created_at: string | null
          description: string | null
          facturado: boolean | null
          id: string
          invoice_state:
            | Database["public"]["Enums"]["invoice_state_type"]
            | null
          iva_amount: number | null
          method: string
          payment_date: string | null
          received_by: string | null
          refund_amount: number | null
          refunded_at: string | null
          shift_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          client_id?: string | null
          clinic_id: string
          created_at?: string | null
          description?: string | null
          facturado?: boolean | null
          id?: string
          invoice_state?:
            | Database["public"]["Enums"]["invoice_state_type"]
            | null
          iva_amount?: number | null
          method: string
          payment_date?: string | null
          received_by?: string | null
          refund_amount?: number | null
          refunded_at?: string | null
          shift_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          client_id?: string | null
          clinic_id?: string
          created_at?: string | null
          description?: string | null
          facturado?: boolean | null
          id?: string
          invoice_state?:
            | Database["public"]["Enums"]["invoice_state_type"]
            | null
          iva_amount?: number | null
          method?: string
          payment_date?: string | null
          received_by?: string | null
          refund_amount?: number | null
          refunded_at?: string | null
          shift_id?: string | null
          updated_at?: string | null
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
            foreignKeyName: "payments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
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
          clinic_id: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          is_clinic_owner: boolean | null
          last_name: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          signature_image_url: string | null
          updated_at: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          is_clinic_owner?: boolean | null
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          signature_image_url?: string | null
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          is_clinic_owner?: boolean | null
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          signature_image_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      security_settings: {
        Row: {
          backup_codes: string[] | null
          clinic_id: string
          created_at: string | null
          finance_pin_hash: string | null
          finance_pin_required: boolean | null
          finance_pin_salt: string | null
          id: string
          login_notifications: boolean | null
          max_login_attempts: number | null
          password_expiry_days: number | null
          session_timeout_minutes: number | null
          two_factor_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          backup_codes?: string[] | null
          clinic_id: string
          created_at?: string | null
          finance_pin_hash?: string | null
          finance_pin_required?: boolean | null
          finance_pin_salt?: string | null
          id?: string
          login_notifications?: boolean | null
          max_login_attempts?: number | null
          password_expiry_days?: number | null
          session_timeout_minutes?: number | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          backup_codes?: string[] | null
          clinic_id?: string
          created_at?: string | null
          finance_pin_hash?: string | null
          finance_pin_required?: boolean | null
          finance_pin_salt?: string | null
          id?: string
          login_notifications?: boolean | null
          max_login_attempts?: number | null
          password_expiry_days?: number | null
          session_timeout_minutes?: number | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          clinic_id: string
          created_at: string | null
          end_time: string
          id: string
          start_time: string
          therapist_id: string
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          end_time: string
          id?: string
          start_time: string
          therapist_id: string
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          end_time?: string
          id?: string
          start_time?: string
          therapist_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_invoices: {
        Row: {
          amount: number
          clinic_id: string
          created_at: string | null
          currency: string | null
          due_date: string | null
          id: string
          invoice_date: string | null
          paid_at: string | null
          status: string
          stripe_invoice_id: string | null
          subscription_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          clinic_id: string
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          paid_at?: string | null
          status: string
          stripe_invoice_id?: string | null
          subscription_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          clinic_id?: string
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          paid_at?: string | null
          status?: string
          stripe_invoice_id?: string | null
          subscription_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoices_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "clinic_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          description: string | null
          features: Json
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          max_therapists: number
          name: string
          price_monthly: number
          price_yearly: number
          slug: string
          sort_order: number | null
          stripe_monthly_price_id: string | null
          stripe_yearly_price_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          max_therapists: number
          name: string
          price_monthly: number
          price_yearly: number
          slug: string
          sort_order?: number | null
          stripe_monthly_price_id?: string | null
          stripe_yearly_price_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          max_therapists?: number
          name?: string
          price_monthly?: number
          price_yearly?: number
          slug?: string
          sort_order?: number | null
          stripe_monthly_price_id?: string | null
          stripe_yearly_price_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_usage: {
        Row: {
          appointment_count: number
          client_count: number
          clinic_id: string
          created_at: string | null
          date: string
          id: string
          subscription_id: string
          therapist_count: number
        }
        Insert: {
          appointment_count?: number
          client_count?: number
          clinic_id: string
          created_at?: string | null
          date: string
          id?: string
          subscription_id: string
          therapist_count?: number
        }
        Update: {
          appointment_count?: number
          client_count?: number
          clinic_id?: string
          created_at?: string | null
          date?: string
          id?: string
          subscription_id?: string
          therapist_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscription_usage_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_usage_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "clinic_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          clinic_id: string
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          clinic_id: string
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          clinic_id?: string
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          appointment_id: string | null
          changed_at: string | null
          clinic_id: string
          created_at: string | null
          error_message: string | null
          id: string
          status: string
          sync_type: string
        }
        Insert: {
          appointment_id?: string | null
          changed_at?: string | null
          clinic_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          status: string
          sync_type: string
        }
        Update: {
          appointment_id?: string | null
          changed_at?: string | null
          clinic_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_logs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      therapist_payouts: {
        Row: {
          amount: number
          cfdi_invoice_id: string | null
          clinic_id: string
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          payment_method: string
          payout_date: string
          period_end: string
          period_start: string
          status: string
          therapist_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          cfdi_invoice_id?: string | null
          clinic_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          payout_date?: string
          period_end: string
          period_start: string
          status?: string
          therapist_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          cfdi_invoice_id?: string | null
          clinic_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          payout_date?: string
          period_end?: string
          period_start?: string
          status?: string
          therapist_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "therapist_payouts_cfdi_invoice_id_fkey"
            columns: ["cfdi_invoice_id"]
            isOneToOne: false
            referencedRelation: "cfdi_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_payouts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_payouts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_payouts_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
        ]
      }
      therapist_schedule_rules: {
        Row: {
          buffer_minutes: number
          clinic_id: string
          created_at: string | null
          end_time: string
          id: string
          is_active: boolean
          slot_minutes: number
          start_time: string
          therapist_id: string | null
          updated_at: string | null
          weekday: number
        }
        Insert: {
          buffer_minutes?: number
          clinic_id: string
          created_at?: string | null
          end_time: string
          id?: string
          is_active?: boolean
          slot_minutes?: number
          start_time: string
          therapist_id?: string | null
          updated_at?: string | null
          weekday: number
        }
        Update: {
          buffer_minutes?: number
          clinic_id?: string
          created_at?: string | null
          end_time?: string
          id?: string
          is_active?: boolean
          slot_minutes?: number
          start_time?: string
          therapist_id?: string | null
          updated_at?: string | null
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "therapist_schedule_rules_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_schedule_rules_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
        ]
      }
      therapists: {
        Row: {
          archived: boolean
          calendar_color: string | null
          calendar_color_id: string
          clinic_id: string
          commission_percentage: number | null
          compensation_type: string
          created_at: string | null
          email: string | null
          first_name: string | null
          fixed_session_amount: number | null
          id: string
          incentive_enabled: boolean
          incentive_fixed_bonus: number | null
          incentive_percentage_bonus: number | null
          incentive_threshold_sessions: number | null
          is_active: boolean | null
          last_name: string | null
          license_number: string | null
          percentage: number | null
          phone: string | null
          retention_enabled: boolean
          retention_rate: number
          signature_image_url: string | null
          specialties: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          archived?: boolean
          calendar_color?: string | null
          calendar_color_id?: string
          clinic_id: string
          commission_percentage?: number | null
          compensation_type?: string
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          fixed_session_amount?: number | null
          id?: string
          incentive_enabled?: boolean
          incentive_fixed_bonus?: number | null
          incentive_percentage_bonus?: number | null
          incentive_threshold_sessions?: number | null
          is_active?: boolean | null
          last_name?: string | null
          license_number?: string | null
          percentage?: number | null
          phone?: string | null
          retention_enabled?: boolean
          retention_rate?: number
          signature_image_url?: string | null
          specialties?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          archived?: boolean
          calendar_color?: string | null
          calendar_color_id?: string
          clinic_id?: string
          commission_percentage?: number | null
          compensation_type?: string
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          fixed_session_amount?: number | null
          id?: string
          incentive_enabled?: boolean
          incentive_fixed_bonus?: number | null
          incentive_percentage_bonus?: number | null
          incentive_threshold_sessions?: number | null
          is_active?: boolean | null
          last_name?: string | null
          license_number?: string | null
          percentage?: number | null
          phone?: string | null
          retention_enabled?: boolean
          retention_rate?: number
          signature_image_url?: string | null
          specialties?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "therapists_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
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
          clinic_id: string
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          name: string
          price: number | null
          sat_product_service_code: string | null
          sat_unit_code: string | null
          updated_at: string | null
          vat_exempt: boolean | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number | null
          sat_product_service_code?: string | null
          sat_unit_code?: string | null
          updated_at?: string | null
          vat_exempt?: boolean | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number | null
          sat_product_service_code?: string | null
          sat_unit_code?: string | null
          updated_at?: string | null
          vat_exempt?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "treatments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          appointment_reminders: boolean | null
          calendar_view: string | null
          clinic_id: string
          created_at: string | null
          default_dashboard_view: string | null
          email_notifications: boolean | null
          id: string
          language: string | null
          payment_reminders: boolean | null
          push_notifications: boolean | null
          show_past_appointments: boolean | null
          show_quick_stats: boolean | null
          show_recent_activity: boolean | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          appointment_reminders?: boolean | null
          calendar_view?: string | null
          clinic_id: string
          created_at?: string | null
          default_dashboard_view?: string | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          payment_reminders?: boolean | null
          push_notifications?: boolean | null
          show_past_appointments?: boolean | null
          show_quick_stats?: boolean | null
          show_recent_activity?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          appointment_reminders?: boolean | null
          calendar_view?: string | null
          clinic_id?: string
          created_at?: string | null
          default_dashboard_view?: string | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          payment_reminders?: boolean | null
          push_notifications?: boolean | null
          show_past_appointments?: boolean | null
          show_quick_stats?: boolean | null
          show_recent_activity?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      subscription_performance_stats: {
        Row: {
          active_ratio: number | null
          query_type: string | null
          record_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_backup_codes: { Args: never; Returns: string[] }
      get_user_clinic_id: { Args: never; Returns: string }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_therapist_id: { Args: never; Returns: string }
      has_appointment_conflict: {
        Args: {
          end_time: string
          exclude_appointment_id?: string
          start_time: string
          therapist_id: string
        }
        Returns: boolean
      }
      is_clinic_owner: { Args: never; Returns: boolean }
      log_slow_subscription_query: {
        Args: {
          clinic_id?: string
          execution_time_ms: number
          query_name: string
        }
        Returns: undefined
      }
    }
    Enums: {
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "in_progress"
        | "waiting_checkout"
        | "completed"
        | "cancelled"
        | "no_show"
      cfdi_status: "draft" | "issued" | "canceled"
      cfdi_type: "ingreso" | "egreso" | "pago"
      gender_type: "male" | "female" | "other"
      invoice_state_type:
        | "non_invoiced"
        | "individually_invoiced"
        | "globally_invoiced"
      user_role: "admin" | "therapist" | "reception"
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
      appointment_status: [
        "scheduled",
        "confirmed",
        "in_progress",
        "waiting_checkout",
        "completed",
        "cancelled",
        "no_show",
      ],
      cfdi_status: ["draft", "issued", "canceled"],
      cfdi_type: ["ingreso", "egreso", "pago"],
      gender_type: ["male", "female", "other"],
      invoice_state_type: [
        "non_invoiced",
        "individually_invoiced",
        "globally_invoiced",
      ],
      user_role: ["admin", "therapist", "reception"],
    },
  },
} as const

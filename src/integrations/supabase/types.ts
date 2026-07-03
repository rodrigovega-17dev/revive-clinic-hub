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
          clinic_id: string
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
          clinic_id?: string
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
          clinic_id?: string
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
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
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
      clinics: {
        Row: {
          id: string
          name: string
          slug: string
          address: string | null
          phone: string | null
          email: string | null
          timezone: string
          currency: string
          logo_url: string | null
          settings: Json
          is_active: boolean
          created_at: string
          updated_at: string
          google_calendar_auth: Json | null
          google_calendar_selected_id: string | null
          google_calendar_enabled: boolean
          google_calendar_sync_settings: Json
          subscription_status: string
          trial_ends_at: string | null
          subscription_plan_id: string | null
          stripe_customer_id: string | null
          facturapi_test_secret: string | null
          facturapi_live_secret: string | null
          facturapi_use_live: boolean
          facturapi_webhook_secret: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          address?: string | null
          phone?: string | null
          email?: string | null
          timezone?: string
          currency?: string
          logo_url?: string | null
          settings?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
          google_calendar_auth?: Json | null
          google_calendar_selected_id?: string | null
          google_calendar_enabled?: boolean
          google_calendar_sync_settings?: Json
          subscription_status?: string
          trial_ends_at?: string | null
          subscription_plan_id?: string | null
          stripe_customer_id?: string | null
          facturapi_test_secret?: string | null
          facturapi_live_secret?: string | null
          facturapi_use_live?: boolean
          facturapi_webhook_secret?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          address?: string | null
          phone?: string | null
          email?: string | null
          timezone?: string
          currency?: string
          logo_url?: string | null
          settings?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
          google_calendar_auth?: Json | null
          google_calendar_selected_id?: string | null
          google_calendar_enabled?: boolean
          google_calendar_sync_settings?: Json
          subscription_status?: string
          trial_ends_at?: string | null
          subscription_plan_id?: string | null
          stripe_customer_id?: string | null
          facturapi_test_secret?: string | null
          facturapi_live_secret?: string | null
          facturapi_use_live?: boolean
          facturapi_webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinics_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          }
        ]
      }
      clients: {
        Row: {
          address: string | null
          archived: boolean
          birth_date: string | null
          charge_amount: number | null
          clinic_id: string
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
          rfc: string | null
          tax_regime: string | null
          cfdi_use: string | null
          cfdi_email: string | null
          facturapi_customer_id: string | null
        }
        Insert: {
          address?: string | null
          archived?: boolean
          birth_date?: string | null
          charge_amount?: number | null
          clinic_id?: string
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
          rfc?: string | null
          tax_regime?: string | null
          cfdi_use?: string | null
          cfdi_email?: string | null
          facturapi_customer_id?: string | null
        }
        Update: {
          address?: string | null
          archived?: boolean
          birth_date?: string | null
          charge_amount?: number | null
          clinic_id?: string
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
          rfc?: string | null
          tax_regime?: string | null
          cfdi_use?: string | null
          cfdi_email?: string | null
          facturapi_customer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          }
        ]
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
          clinic_id?: string
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
          }
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          clinic_id: string
          created_at: string
          date: string
          description: string
          id: string
          recorded_by: string | null
          therapist_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string | null
          clinic_id?: string
          created_at?: string
          date: string
          description: string
          id?: string
          recorded_by?: string | null
          therapist_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          clinic_id?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          recorded_by?: string | null
          therapist_id?: string | null
          updated_at?: string
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
            foreignKeyName: "expenses_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      payments: {
        Row: {
          amount: number
          appointment_id: string | null
          client_id: string | null
          clinic_id: string
          created_at: string
          description: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          payment_date: string
          received_by: string | null
          shift_id: string | null
          facturado: boolean | null
          iva_amount: number | null
          invoice_state: Database["public"]["Enums"]["invoice_state_type"]
          refunded_at: string | null
          refund_amount: number | null
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          client_id?: string | null
          clinic_id?: string
          created_at?: string
          description?: string | null
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          payment_date?: string
          received_by?: string | null
          shift_id?: string | null
          facturado?: boolean | null
          iva_amount?: number | null
          invoice_state?: Database["public"]["Enums"]["invoice_state_type"]
          refunded_at?: string | null
          refund_amount?: number | null
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          client_id?: string | null
          clinic_id?: string
          created_at?: string
          description?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          payment_date?: string
          received_by?: string | null
          shift_id?: string | null
          facturado?: boolean | null
          iva_amount?: number | null
          invoice_state?: Database["public"]["Enums"]["invoice_state_type"]
          refunded_at?: string | null
          refund_amount?: number | null
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
      cfdi_invoices: {
        Row: {
          id: string
          clinic_id: string
          facturapi_id: string | null
          uuid: string | null
          type: Database["public"]["Enums"]["cfdi_type"]
          status: Database["public"]["Enums"]["cfdi_status"]
          folio: string | null
          total: number
          subtotal: number
          tax: number
          currency: string
          emitted_at: string | null
          related_cfdi_id: string | null
          global_period_start: string | null
          global_period_end: string | null
          created_at: string
          updated_at: string
          canceled_at: string | null
          pdf_url: string | null
          xml_url: string | null
          raw_response: Json | null
          source: string | null
        }
        Insert: {
          id?: string
          clinic_id: string
          facturapi_id?: string | null
          uuid?: string | null
          type: Database["public"]["Enums"]["cfdi_type"]
          status?: Database["public"]["Enums"]["cfdi_status"]
          folio?: string | null
          total?: number
          subtotal?: number
          tax?: number
          currency?: string
          emitted_at?: string | null
          related_cfdi_id?: string | null
          global_period_start?: string | null
          global_period_end?: string | null
          created_at?: string
          updated_at?: string
          canceled_at?: string | null
          pdf_url?: string | null
          xml_url?: string | null
          raw_response?: Json | null
          source?: string | null
        }
        Update: {
          id?: string
          clinic_id?: string
          facturapi_id?: string | null
          uuid?: string | null
          type?: Database["public"]["Enums"]["cfdi_type"]
          status?: Database["public"]["Enums"]["cfdi_status"]
          folio?: string | null
          total?: number
          subtotal?: number
          tax?: number
          currency?: string
          emitted_at?: string | null
          related_cfdi_id?: string | null
          global_period_start?: string | null
          global_period_end?: string | null
          created_at?: string
          updated_at?: string
          canceled_at?: string | null
          pdf_url?: string | null
          xml_url?: string | null
          raw_response?: Json | null
          source?: string | null
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
      cfdi_invoice_payments: {
        Row: {
          id: string
          cfdi_invoice_id: string
          payment_id: string
          amount: number
          created_at: string
        }
        Insert: {
          id?: string
          cfdi_invoice_id: string
          payment_id: string
          amount: number
          created_at?: string
        }
        Update: {
          id?: string
          cfdi_invoice_id?: string
          payment_id?: string
          amount?: number
          created_at?: string
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
      profiles: {
        Row: {
          clinic_id: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          is_active: boolean
          is_clinic_owner: boolean
          last_name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          signature_image_url: string | null
          updated_at: string
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          email: string
          first_name: string
          id: string
          is_active?: boolean
          is_clinic_owner?: boolean
          last_name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          signature_image_url?: string | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean
          is_clinic_owner?: boolean
          last_name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          signature_image_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          }
        ]
      }
      shifts: {
        Row: {
          clinic_id: string
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
          clinic_id?: string
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
          clinic_id?: string
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
            foreignKeyName: "shifts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
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
          clinic_id: string
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
          clinic_id?: string
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
          clinic_id?: string
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
        Relationships: [
          {
            foreignKeyName: "suppliers_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          }
        ]
      }
      therapists: {
        Row: {
          archived: boolean
          calendar_color_id: string | null
          clinic_id: string
          commission_percentage: number | null
          created_at: string
          email: string | null
          first_name: string | null
          google_calendar_id: string | null
          id: string
          is_active: boolean
          last_name: string | null
          license_number: string | null
          signature_image_url: string | null
          specialties: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          archived?: boolean
          calendar_color_id?: string | null
          clinic_id?: string
          commission_percentage?: number | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          google_calendar_id?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          license_number?: string | null
          signature_image_url?: string | null
          specialties?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          archived?: boolean
          calendar_color_id?: string | null
          clinic_id?: string
          commission_percentage?: number | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          google_calendar_id?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          license_number?: string | null
          signature_image_url?: string | null
          specialties?: string[] | null
          updated_at?: string
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
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price: number | null
          updated_at: string
          sat_product_service_code: string | null
          sat_unit_code: string | null
          vat_exempt: boolean
        }
        Insert: {
          clinic_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name: string
          price?: number | null
          updated_at?: string
          sat_product_service_code?: string | null
          sat_unit_code?: string | null
          vat_exempt?: boolean
        }
        Update: {
          clinic_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number | null
          updated_at?: string
          sat_product_service_code?: string | null
          sat_unit_code?: string | null
          vat_exempt?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "treatments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          }
        ]
      }
      therapist_payouts: {
        Row: {
          id: string
          clinic_id: string
          therapist_id: string
          period_start: string
          period_end: string
          payout_date: string
          amount: number
          payment_method: string
          notes: string | null
          status: string
          created_by: string | null
          created_at: string
          updated_at: string
          cfdi_invoice_id: string | null
        }
        Insert: {
          id?: string
          clinic_id: string
          therapist_id: string
          period_start: string
          period_end: string
          payout_date?: string
          amount: number
          payment_method?: string
          notes?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
          cfdi_invoice_id?: string | null
        }
        Update: {
          id?: string
          clinic_id?: string
          therapist_id?: string
          period_start?: string
          period_end?: string
          payout_date?: string
          amount?: number
          payment_method?: string
          notes?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
          cfdi_invoice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "therapist_payouts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_payouts_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
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
            foreignKeyName: "therapist_payouts_cfdi_invoice_id_fkey"
            columns: ["cfdi_invoice_id"]
            isOneToOne: false
            referencedRelation: "cfdi_invoices"
            referencedColumns: ["id"]
          }
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
          new_status: string | null
          old_status: string | null
        }
        Insert: {
          appointment_id?: string | null
          changed_at?: string | null
          clinic_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          new_status?: string | null
          old_status?: string | null
        }
        Update: {
          appointment_id?: string | null
          changed_at?: string | null
          clinic_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          new_status?: string | null
          old_status?: string | null
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
          }
        ]
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          clinic_id: string
          email_notifications: boolean
          push_notifications: boolean
          appointment_reminders: boolean
          payment_reminders: boolean
          theme: string
          language: string
          default_dashboard_view: string
          show_quick_stats: boolean
          show_recent_activity: boolean
          calendar_view: string
          show_past_appointments: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          clinic_id: string
          email_notifications?: boolean
          push_notifications?: boolean
          appointment_reminders?: boolean
          payment_reminders?: boolean
          theme?: string
          language?: string
          default_dashboard_view?: string
          show_quick_stats?: boolean
          show_recent_activity?: boolean
          calendar_view?: string
          show_past_appointments?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          clinic_id?: string
          email_notifications?: boolean
          push_notifications?: boolean
          appointment_reminders?: boolean
          payment_reminders?: boolean
          theme?: string
          language?: string
          default_dashboard_view?: string
          show_quick_stats?: boolean
          show_recent_activity?: boolean
          calendar_view?: string
          show_past_appointments?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_preferences_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          }
        ]
      }
      user_sessions: {
        Row: {
          id: string
          user_id: string
          clinic_id: string
          session_token: string
          device_info: Json | null
          ip_address: string | null
          user_agent: string | null
          is_active: boolean
          expires_at: string
          created_at: string
          last_activity_at: string
        }
        Insert: {
          id?: string
          user_id: string
          clinic_id: string
          session_token: string
          device_info?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          is_active?: boolean
          expires_at: string
          created_at?: string
          last_activity_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          clinic_id?: string
          session_token?: string
          device_info?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          is_active?: boolean
          expires_at?: string
          created_at?: string
          last_activity_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          }
        ]
      }
      login_history: {
        Row: {
          id: string
          user_id: string | null
          clinic_id: string
          email: string
          ip_address: string | null
          user_agent: string | null
          success: boolean
          failure_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          clinic_id: string
          email: string
          ip_address?: string | null
          user_agent?: string | null
          success: boolean
          failure_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          clinic_id?: string
          email?: string
          ip_address?: string | null
          user_agent?: string | null
          success?: boolean
          failure_reason?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "login_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "login_history_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          }
        ]
      }
      security_settings: {
        Row: {
          id: string
          user_id: string
          clinic_id: string
          two_factor_enabled: boolean
          two_factor_method: string
          backup_codes: string[] | null
          password_changed_at: string
          require_password_change: boolean
          max_concurrent_sessions: number
          session_timeout_minutes: number
          login_notifications: boolean
          suspicious_activity_alerts: boolean
          finance_pin_required: boolean
          finance_pin_salt: string | null
          finance_pin_hash: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          clinic_id: string
          two_factor_enabled?: boolean
          two_factor_method?: string
          backup_codes?: string[] | null
          password_changed_at?: string
          require_password_change?: boolean
          max_concurrent_sessions?: number
          session_timeout_minutes?: number
          login_notifications?: boolean
          suspicious_activity_alerts?: boolean
          finance_pin_required?: boolean
          finance_pin_salt?: string | null
          finance_pin_hash?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          clinic_id?: string
          two_factor_enabled?: boolean
          two_factor_method?: string
          backup_codes?: string[] | null
          password_changed_at?: string
          require_password_change?: boolean
          max_concurrent_sessions?: number
          session_timeout_minutes?: number
          login_notifications?: boolean
          suspicious_activity_alerts?: boolean
          finance_pin_required?: boolean
          finance_pin_salt?: string | null
          finance_pin_hash?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          }
        ]
      }
      subscription_plans: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          price_monthly: number
          price_yearly: number
          max_therapists: number
          features: Json
          stripe_monthly_price_id: string | null
          stripe_yearly_price_id: string | null
          is_active: boolean
          is_popular: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          price_monthly: number
          price_yearly: number
          max_therapists: number
          features?: Json
          stripe_monthly_price_id?: string | null
          stripe_yearly_price_id?: string | null
          is_active?: boolean
          is_popular?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          price_monthly?: number
          price_yearly?: number
          max_therapists?: number
          features?: Json
          stripe_monthly_price_id?: string | null
          stripe_yearly_price_id?: string | null
          is_active?: boolean
          is_popular?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      clinic_subscriptions: {
        Row: {
          id: string
          clinic_id: string
          plan_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          status: string
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          trial_start: string | null
          trial_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          plan_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          trial_start?: string | null
          trial_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          plan_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          trial_start?: string | null
          trial_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_subscriptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          }
        ]
      }
      subscription_usage: {
        Row: {
          id: string
          clinic_id: string
          subscription_id: string
          date: string
          therapist_count: number
          appointment_count: number
          client_count: number
          created_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          subscription_id: string
          date: string
          therapist_count?: number
          appointment_count?: number
          client_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          subscription_id?: string
          date?: string
          therapist_count?: number
          appointment_count?: number
          client_count?: number
          created_at?: string
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
          }
        ]
      }
      subscription_invoices: {
        Row: {
          id: string
          clinic_id: string
          subscription_id: string
          stripe_invoice_id: string | null
          amount: number
          currency: string
          status: string
          invoice_date: string | null
          due_date: string | null
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id: string
          subscription_id: string
          stripe_invoice_id?: string | null
          amount: number
          currency?: string
          status: string
          invoice_date?: string | null
          due_date?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          subscription_id?: string
          stripe_invoice_id?: string | null
          amount?: number
          currency?: string
          status?: string
          invoice_date?: string | null
          due_date?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
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
          }
        ]
      }
      document_templates: {
        Row: {
          id: string
          clinic_id: string
          slug: string
          name: string
          description: string | null
          type: string
          category: string | null
          language: string
          version: number
          is_active: boolean
          schema: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_id?: string
          slug: string
          name: string
          description?: string | null
          type: string
          category?: string | null
          language?: string
          version?: number
          is_active?: boolean
          schema: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clinic_id?: string
          slug?: string
          name?: string
          description?: string | null
          type?: string
          category?: string | null
          language?: string
          version?: number
          is_active?: boolean
          schema?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          }
        ]
      }
      document_instances: {
        Row: {
          id: string
          clinic_id: string
          template_id: string
          template_version: number
          client_id: string
          appointment_id: string | null
          status: string
          data: Json
          rendered_pdf_url: string | null
          share_token: string | null
          responsible_person_type: 'therapist' | 'user' | 'clinic' | null
          responsible_person_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          finalized_at: string | null
        }
        Insert: {
          id?: string
          clinic_id: string
          template_id: string
          template_version: number
          client_id: string
          appointment_id?: string | null
          status?: string
          data: Json
          rendered_pdf_url?: string | null
          share_token?: string | null
          responsible_person_type?: 'therapist' | 'user' | 'clinic' | null
          responsible_person_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          finalized_at?: string | null
        }
        Update: {
          id?: string
          clinic_id?: string
          template_id?: string
          template_version?: number
          client_id?: string
          appointment_id?: string | null
          status?: string
          data?: Json
          rendered_pdf_url?: string | null
          share_token?: string | null
          responsible_person_type?: 'therapist' | 'user' | 'clinic' | null
          responsible_person_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          finalized_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_instances_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
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
            foreignKeyName: "document_instances_appointment_id_fkey"
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
      get_user_clinic_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_therapist_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_clinic_owner: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      generate_backup_codes: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      log_login_attempt: {
        Args: {
          p_user_id: string
          p_email: string
          p_success: boolean
          p_failure_reason?: string
        }
        Returns: undefined
      }
      get_clinic_subscription_status: {
        Args: {
          clinic_uuid: string
        }
        Returns: Json
      }
    }
    Enums: {
      appointment_status: "scheduled" | "completed" | "cancelled" | "no_show"
      cfdi_status: "draft" | "issued" | "canceled"
      cfdi_type: "ingreso" | "egreso" | "pago"
      gender: "male" | "female" | "other" | "prefer_not_to_say"
      invoice_state_type: "non_invoiced" | "individually_invoiced" | "globally_invoiced"
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
      cfdi_status: ["draft", "issued", "canceled"],
      cfdi_type: ["ingreso", "egreso", "pago"],
      gender: ["male", "female", "other", "prefer_not_to_say"],
      invoice_state_type: ["non_invoiced", "individually_invoiced", "globally_invoiced"],
      payment_method: ["cash", "card", "transfer", "insurance"],
      user_role: ["admin", "therapist", "reception"],
    },
  },
} as const

export interface UserPreferences {
  id: string;
  user_id: string;
  clinic_id: string;
  
  // Notification preferences
  email_notifications: boolean;
  push_notifications: boolean;
  appointment_reminders: boolean;
  payment_reminders: boolean;
  
  // UI preferences
  theme: 'light' | 'dark' | 'system';
  language: string;
  
  // Dashboard preferences
  default_dashboard_view: 'overview' | 'appointments' | 'finance';
  show_quick_stats: boolean;
  show_recent_activity: boolean;
  
  // Calendar preferences
  calendar_view: 'day' | 'week' | 'month';
  show_past_appointments: boolean;
  
  created_at: string;
  updated_at: string;
}

export interface UpdateUserPreferencesData {
  email_notifications?: boolean;
  push_notifications?: boolean;
  appointment_reminders?: boolean;
  payment_reminders?: boolean;
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  default_dashboard_view?: 'overview' | 'appointments' | 'finance';
  show_quick_stats?: boolean;
  show_recent_activity?: boolean;
  calendar_view?: 'day' | 'week' | 'month';
  show_past_appointments?: boolean;
}

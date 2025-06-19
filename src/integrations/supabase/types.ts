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
      bank_info: {
        Row: {
          account_holder_name: string
          account_number: string
          bank_name: string
          created_at: string
          id: string
          ifsc_code: string
          merchant_id: string
          upi_id: string | null
        }
        Insert: {
          account_holder_name: string
          account_number: string
          bank_name: string
          created_at?: string
          id?: string
          ifsc_code: string
          merchant_id: string
          upi_id?: string | null
        }
        Update: {
          account_holder_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string
          id?: string
          ifsc_code?: string
          merchant_id?: string
          upi_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_info_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          date: string
          id: string
          merchant_id: string
          payment_status: string
          service_id: string
          services: Json | null
          staff_id: string | null
          status: string
          stylist_name: string | null
          time_slot: string
          total_duration: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          date: string
          id?: string
          merchant_id: string
          payment_status: string
          service_id: string
          services?: Json | null
          staff_id?: string | null
          status: string
          stylist_name?: string | null
          time_slot: string
          total_duration?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          date?: string
          id?: string
          merchant_id?: string
          payment_status?: string
          service_id?: string
          services?: Json | null
          staff_id?: string | null
          status?: string
          stylist_name?: string | null
          time_slot?: string
          total_duration?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          address: string
          category: string
          close_time: string
          created_at: string
          description: string | null
          gender_focus: string
          id: string
          image_url: string | null
          lat: number
          lng: number
          open_time: string
          rating: number | null
          shop_name: string
          user_id: string
        }
        Insert: {
          address: string
          category: string
          close_time: string
          created_at?: string
          description?: string | null
          gender_focus?: string
          id?: string
          image_url?: string | null
          lat: number
          lng: number
          open_time: string
          rating?: number | null
          shop_name: string
          user_id: string
        }
        Update: {
          address?: string
          category?: string
          close_time?: string
          created_at?: string
          description?: string | null
          gender_focus?: string
          id?: string
          image_url?: string | null
          lat?: number
          lng?: number
          open_time?: string
          rating?: number | null
          shop_name?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          body: string
          error_message: string | null
          fcm_response: string | null
          id: string
          sent_at: string | null
          status: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body: string
          error_message?: string | null
          fcm_response?: string | null
          id?: string
          sent_at?: string | null
          status?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          body?: string
          error_message?: string | null
          fcm_response?: string | null
          id?: string
          sent_at?: string | null
          status?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          body: string
          data: Json | null
          error_message: string | null
          id: string
          scheduled_at: string
          sent_at: string | null
          status: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          data?: Json | null
          error_message?: string | null
          id?: string
          scheduled_at: string
          sent_at?: string | null
          status?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          data?: Json | null
          error_message?: string | null
          id?: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string
          failed_notification_count: number
          fcm_token: string | null
          last_failure_reason: string | null
          last_notification_sent: string | null
          notification_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          failed_notification_count?: number
          fcm_token?: string | null
          last_failure_reason?: string | null
          last_notification_sent?: string | null
          notification_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          failed_notification_count?: number
          fcm_token?: string | null
          last_failure_reason?: string | null
          last_notification_sent?: string | null
          notification_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          id: string
          method: string
          status: string
          timestamp: string
        }
        Insert: {
          amount: number
          booking_id: string
          id?: string
          method: string
          status: string
          timestamp?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          id?: string
          method?: string
          status?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          fcm_token: string | null
          id: string
          last_notification_sent: string | null
          name: string
          notification_enabled: boolean | null
          phone: string | null
          role: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          fcm_token?: string | null
          id: string
          last_notification_sent?: string | null
          name: string
          notification_enabled?: boolean | null
          phone?: string | null
          role: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          fcm_token?: string | null
          id?: string
          last_notification_sent?: string | null
          name?: string
          notification_enabled?: boolean | null
          phone?: string | null
          role?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          created_at: string
          customer_avatar: string | null
          customer_name: string | null
          id: string
          rating: number
          review: string | null
          user_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          customer_avatar?: string | null
          customer_name?: string | null
          id?: string
          rating: number
          review?: string | null
          user_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          customer_avatar?: string | null
          customer_name?: string | null
          id?: string
          rating?: number
          review?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          duration: number
          id: string
          image_url: string | null
          merchant_id: string
          name: string
          price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration: number
          id?: string
          image_url?: string | null
          merchant_id: string
          name: string
          price: number
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          image_url?: string | null
          merchant_id?: string
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_holidays: {
        Row: {
          created_at: string
          description: string | null
          holiday_date: string
          id: string
          merchant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          holiday_date: string
          id?: string
          merchant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          holiday_date?: string
          id?: string
          merchant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_holidays_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_income_reports: {
        Row: {
          created_at: string
          generated_at: string
          id: string
          is_holiday: boolean
          merchant_id: string
          merchant_share: number
          open_days: number
          platform_income: number
          report_date: string
          report_type: string
          shop_name: string
          total_bookings: number
          total_customers: number
          total_earnings: number
          total_reviews: number
          total_services: number
        }
        Insert: {
          created_at?: string
          generated_at?: string
          id?: string
          is_holiday?: boolean
          merchant_id: string
          merchant_share?: number
          open_days?: number
          platform_income?: number
          report_date: string
          report_type: string
          shop_name: string
          total_bookings?: number
          total_customers?: number
          total_earnings?: number
          total_reviews?: number
          total_services?: number
        }
        Update: {
          created_at?: string
          generated_at?: string
          id?: string
          is_holiday?: boolean
          merchant_id?: string
          merchant_share?: number
          open_days?: number
          platform_income?: number
          report_date?: string
          report_type?: string
          shop_name?: string
          total_bookings?: number
          total_customers?: number
          total_earnings?: number
          total_reviews?: number
          total_services?: number
        }
        Relationships: []
      }
      slot_locks: {
        Row: {
          created_at: string
          date: string
          expires_at: string
          id: string
          locked_by: string | null
          staff_id: string
          time_slot: string
        }
        Insert: {
          created_at?: string
          date: string
          expires_at: string
          id?: string
          locked_by?: string | null
          staff_id: string
          time_slot: string
        }
        Update: {
          created_at?: string
          date?: string
          expires_at?: string
          id?: string
          locked_by?: string | null
          staff_id?: string
          time_slot?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          created_at: string
          id: string
          merchant_id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      stylist_blocked_slots: {
        Row: {
          blocked_date: string
          created_at: string
          description: string | null
          end_time: string | null
          id: string
          merchant_id: string
          staff_id: string
          start_time: string | null
          time_slot: string
        }
        Insert: {
          blocked_date: string
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          merchant_id: string
          staff_id: string
          start_time?: string | null
          time_slot: string
        }
        Update: {
          blocked_date?: string
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          merchant_id?: string
          staff_id?: string
          start_time?: string | null
          time_slot?: string
        }
        Relationships: [
          {
            foreignKeyName: "stylist_blocked_slots_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stylist_blocked_slots_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      stylist_holidays: {
        Row: {
          created_at: string
          description: string | null
          holiday_date: string
          id: string
          merchant_id: string
          staff_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          holiday_date: string
          id?: string
          merchant_id: string
          staff_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          holiday_date?: string
          id?: string
          merchant_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stylist_holidays_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stylist_holidays_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          enabled: boolean
          id: string
          notification_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          enabled?: boolean
          id?: string
          notification_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          enabled?: boolean
          id?: string
          notification_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      book_appointment_with_duration_blocking: {
        Args: {
          p_booking_id: string
          p_staff_id: string
          p_date: string
          p_time_slot: string
          p_service_duration?: number
        }
        Returns: Json
      }
      book_stylist_slot: {
        Args: {
          p_staff_id: string
          p_date: string
          p_time_slot: string
          p_booking_id: string
          p_service_duration?: number
        }
        Returns: Json
      }
      cancel_booking: {
        Args: { p_booking_id: string; p_user_id?: string }
        Returns: Json
      }
      cancel_booking_and_release_all_slots: {
        Args: { p_booking_id: string; p_user_id?: string }
        Returns: Json
      }
      cancel_booking_and_release_slots: {
        Args: { p_booking_id: string; p_user_id?: string }
        Returns: Json
      }
      cancel_booking_properly: {
        Args: { p_booking_id: string; p_user_id: string }
        Returns: Json
      }
      cancel_booking_simple: {
        Args: { p_booking_id: string; p_user_id: string }
        Returns: Json
      }
      cancel_pending_booking: {
        Args: { p_booking_id: string; p_user_id: string }
        Returns: Json
      }
      check_slot_availability_with_duration: {
        Args: {
          p_staff_id: string
          p_date: string
          p_start_time: string
          p_service_duration?: number
        }
        Returns: boolean
      }
      check_slot_availability_with_service_duration: {
        Args: {
          p_staff_id: string
          p_date: string
          p_start_time: string
          p_service_duration?: number
        }
        Returns: Json
      }
      cleanup_expired_locks: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      clear_stylist_availability: {
        Args: { p_staff_id: string; p_date: string }
        Returns: Json
      }
      confirm_booking_payment: {
        Args: { p_booking_id: string; p_user_id: string }
        Returns: Json
      }
      confirm_pending_booking: {
        Args: { p_booking_id: string; p_user_id: string }
        Returns: Json
      }
      create_booking_from_payment: {
        Args: {
          p_user_id: string
          p_merchant_id: string
          p_service_id: string
          p_staff_id: string
          p_date: string
          p_time_slot: string
          p_service_duration: number
        }
        Returns: Json
      }
      create_confirmed_booking: {
        Args: {
          p_user_id: string
          p_merchant_id: string
          p_service_id: string
          p_staff_id: string
          p_date: string
          p_time_slot: string
          p_service_duration: number
        }
        Returns: Json
      }
      create_slot_lock: {
        Args: {
          p_staff_id: string
          p_date: string
          p_time_slot: string
          p_lock_duration_minutes?: number
        }
        Returns: Json
      }
      ensure_user_profile: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      fix_completed_bookings_payment_status: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      generate_all_shop_income_reports: {
        Args: { report_date: string; report_type: string }
        Returns: undefined
      }
      generate_shop_income_report: {
        Args:
          | {
              in_merchant_id: string
              in_report_date: string
              in_report_type: string
            }
          | { p_report_date: string; p_report_type: string }
        Returns: undefined
      }
      get_available_slots: {
        Args:
          | { p_merchant_id: string; p_date: string; p_staff_id?: string }
          | {
              p_merchant_id: string
              p_date: string
              p_staff_id?: string
              p_service_duration?: number
            }
        Returns: {
          staff_id: string
          staff_name: string
          time_slot: string
          slot_timestamp: string
          is_shop_holiday: boolean
          is_stylist_holiday: boolean
          shop_holiday_reason: string
          stylist_holiday_reason: string
        }[]
      }
      get_available_slots_current_time: {
        Args: {
          p_merchant_id: string
          p_date: string
          p_staff_id?: string
          p_service_duration?: number
        }
        Returns: {
          staff_id: string
          staff_name: string
          time_slot: string
          is_available: boolean
          conflict_reason: string
        }[]
      }
      get_available_slots_simple: {
        Args: {
          p_merchant_id: string
          p_date: string
          p_staff_id?: string
          p_service_duration?: number
        }
        Returns: {
          staff_id: string
          staff_name: string
          time_slot: string
          is_available: boolean
          conflict_reason: string
        }[]
      }
      get_available_slots_with_ist_buffer: {
        Args: {
          p_merchant_id: string
          p_date: string
          p_staff_id?: string
          p_service_duration?: number
        }
        Returns: {
          staff_id: string
          staff_name: string
          time_slot: string
          is_available: boolean
          conflict_reason: string
        }[]
      }
      get_available_slots_with_validation: {
        Args: {
          p_merchant_id: string
          p_date: string
          p_staff_id?: string
          p_service_duration?: number
        }
        Returns: {
          staff_id: string
          staff_name: string
          time_slot: string
          is_available: boolean
          conflict_reason: string
        }[]
      }
      get_available_time_slots: {
        Args: { merchant_id_param: string; date_param: string }
        Returns: {
          id: string
          start_time: string
          duration: number
        }[]
      }
      get_booking_services: {
        Args: { p_booking_id: string }
        Returns: {
          service_id: string
          service_name: string
          service_duration: number
          service_price: number
        }[]
      }
      get_booking_total_duration: {
        Args: { p_booking_id: string }
        Returns: number
      }
      get_fresh_available_slots: {
        Args: { p_merchant_id: string; p_date: string; p_staff_id?: string }
        Returns: {
          staff_id: string
          staff_name: string
          time_slot: string
          slot_status: string
          status_reason: string
        }[]
      }
      get_stylist_blocked_ranges: {
        Args: { p_staff_id: string; p_date: string }
        Returns: {
          id: string
          start_time: string
          end_time: string
          description: string
        }[]
      }
      manage_stylist_availability: {
        Args: {
          p_staff_id: string
          p_merchant_id: string
          p_date: string
          p_is_full_day: boolean
          p_blocked_slots?: string[]
          p_description?: string
        }
        Returns: Json
      }
      manage_stylist_availability_ranges: {
        Args: {
          p_staff_id: string
          p_merchant_id: string
          p_date: string
          p_is_full_day: boolean
          p_blocked_ranges?: Json
          p_description?: string
        }
        Returns: Json
      }
      release_slot_lock: {
        Args: { p_staff_id: string; p_date: string; p_time_slot: string }
        Returns: Json
      }
      release_stylist_slots: {
        Args: { p_booking_id: string }
        Returns: Json
      }
      reserve_slot: {
        Args: {
          p_user_id: string
          p_merchant_id: string
          p_service_id: string
          p_staff_id: string
          p_date: string
          p_time_slot: string
          p_service_duration: number
        }
        Returns: Json
      }
      reserve_slot_immediately: {
        Args: {
          p_user_id: string
          p_merchant_id: string
          p_service_id: string
          p_staff_id: string
          p_date: string
          p_time_slot: string
          p_service_duration: number
        }
        Returns: Json
      }
      reserve_slot_temporarily: {
        Args: {
          p_user_id: string
          p_merchant_id: string
          p_service_id: string
          p_staff_id: string
          p_date: string
          p_time_slot: string
          p_service_duration: number
        }
        Returns: Json
      }
      update_booking_status: {
        Args: {
          booking_id: string
          new_status: string
          merchant_user_id?: string
        }
        Returns: Json
      }
      update_booking_status_and_release_slots: {
        Args: {
          p_booking_id: string
          p_new_status: string
          p_merchant_user_id?: string
        }
        Returns: Json
      }
      update_booking_status_with_slot_management: {
        Args: { p_booking_id: string; p_new_status: string; p_user_id?: string }
        Returns: Json
      }
      update_merchant_hours: {
        Args: {
          p_merchant_id: string
          p_open_time: string
          p_close_time: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

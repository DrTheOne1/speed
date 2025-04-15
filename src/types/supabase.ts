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
      contacts: {
        Row: {
          created_at: string | null
          id: string
          name: string
          phone_number: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          phone_number: string
          user_id?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          phone_number?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_subscriptions: {
        Row: {
          auto_renew: boolean | null
          created_at: string | null
          end_date: string | null
          id: string
          start_date: string
          status: string
          subscription_plan_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_renew?: boolean | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          start_date?: string
          status: string
          subscription_plan_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_renew?: boolean | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          start_date?: string
          status?: string
          subscription_plan_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_subscriptions_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      gateway_logs: {
        Row: {
          created_at: string | null
          details: Json
          event_type: string
          gateway_id: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          details: Json
          event_type: string
          gateway_id?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          details?: Json
          event_type?: string
          gateway_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gateway_logs_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "gateways"
            referencedColumns: ["id"]
          },
        ]
      }
      gateway_providers: {
        Row: {
          code: string
          config_schema: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          code: string
          config_schema: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          code?: string
          config_schema?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      gateway_routes: {
        Row: {
          country_codes: string[]
          created_at: string | null
          gateway_id: string
          id: string
          priority: number
        }
        Insert: {
          country_codes: string[]
          created_at?: string | null
          gateway_id: string
          id?: string
          priority?: number
        }
        Update: {
          country_codes?: string[]
          created_at?: string | null
          gateway_id?: string
          id?: string
          priority?: number
        }
        Relationships: [
          {
            foreignKeyName: "gateway_routes_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "gateways"
            referencedColumns: ["id"]
          },
        ]
      }
      gateways: {
        Row: {
          created_at: string | null
          credentials: Json
          id: string
          name: string
          provider: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credentials: Json
          id?: string
          name: string
          provider: string
          status?: string
          user_id?: string
        }
        Update: {
          created_at?: string | null
          credentials?: Json
          id?: string
          name?: string
          provider?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          country_code: string
          created_at: string | null
          group_id: string
          id: string
          phone_number: string
        }
        Insert: {
          country_code: string
          created_at?: string | null
          group_id: string
          id?: string
          phone_number: string
        }
        Update: {
          country_code?: string
          created_at?: string | null
          group_id?: string
          id?: string
          phone_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          user_id?: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string | null
          gateway_id: string | null
          id: string
          message: string
          recipient: string
          scheduled_for: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["message_status"] | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          gateway_id?: string | null
          id?: string
          message: string
          recipient: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"] | null
          user_id?: string
        }
        Update: {
          created_at?: string | null
          gateway_id?: string | null
          id?: string
          message?: string
          recipient?: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "gateways"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          created_at: string | null
          credentials: Json
          id: string
          is_active: boolean | null
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credentials: Json
          id?: string
          is_active?: boolean | null
          name: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credentials?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          payment_date: string | null
          payment_method_id: string | null
          status: string
          subscription_plan_id: string | null
          transaction_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          payment_date?: string | null
          payment_method_id?: string | null
          status: string
          subscription_plan_id?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          payment_date?: string | null
          payment_method_id?: string | null
          status?: string
          subscription_plan_id?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          billing_cycle: string
          created_at: string | null
          credits: number
          currency: string
          description: string | null
          features: string[]
          id: string
          is_active: boolean | null
          name: string
          overage_cost: number | null
          price: number
          updated_at: string | null
        }
        Insert: {
          billing_cycle: string
          created_at?: string | null
          credits: number
          currency?: string
          description?: string | null
          features?: string[]
          id?: string
          is_active?: boolean | null
          name: string
          overage_cost?: number | null
          price: number
          updated_at?: string | null
        }
        Update: {
          billing_cycle?: string
          created_at?: string | null
          credits?: number
          currency?: string
          description?: string | null
          features?: string[]
          id?: string
          is_active?: boolean | null
          name?: string
          overage_cost?: number | null
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      templates: {
        Row: {
          content: string
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          name: string
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          credits: number
          email: string
          gateway_id: string | null
          id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          credits?: number
          email: string
          gateway_id?: string | null
          id: string
          role?: string
        }
        Update: {
          created_at?: string | null
          credits?: number
          email?: string
          gateway_id?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_gateway"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "gateways"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_twilio_credits: {
        Args: { gateway_id: string }
        Returns: Json
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      message_status: "pending" | "sent" | "delivered" | "failed"
      user_role: "user" | "admin"
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
      message_status: ["pending", "sent", "delivered", "failed"],
      user_role: ["user", "admin"],
    },
  },
} as const

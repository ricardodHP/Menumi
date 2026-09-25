export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          emoji: string | null
          id: string
          image_url: string | null
          is_visible: boolean
          name: string
          position: number
          restaurant_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          id?: string
          image_url?: string | null
          is_visible?: boolean
          name: string
          position?: number
          restaurant_id: string
        }
        Update: {
          created_at?: string
          emoji?: string | null
          id?: string
          image_url?: string | null
          is_visible?: boolean
          name?: string
          position?: number
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      diners: {
        Row: {
          alias: string | null
          device_id: string
          id: string
          joined_at: string
          session_id: string
        }
        Insert: {
          alias?: string | null
          device_id: string
          id?: string
          joined_at?: string
          session_id: string
        }
        Update: {
          alias?: string | null
          device_id?: string
          id?: string
          joined_at?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diners_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "table_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      dish_events: {
        Row: {
          category_id: string | null
          created_at: string
          dish_id: string | null
          event_type: Database["public"]["Enums"]["dish_event_type"]
          id: string
          restaurant_id: string
          session_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          dish_id?: string | null
          event_type: Database["public"]["Enums"]["dish_event_type"]
          id?: string
          restaurant_id: string
          session_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          dish_id?: string | null
          event_type?: Database["public"]["Enums"]["dish_event_type"]
          id?: string
          restaurant_id?: string
          session_id?: string | null
        }
        Relationships: []
      }
      dishes: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_available: boolean
          is_featured: boolean
          likes_count: number
          name: string
          position: number
          price: number
          rating: number
          restaurant_id: string
          show_rating: boolean
          tags: string[]
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_available?: boolean
          is_featured?: boolean
          likes_count?: number
          name: string
          position?: number
          price?: number
          rating?: number
          restaurant_id: string
          show_rating?: boolean
          tags?: string[]
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_available?: boolean
          is_featured?: boolean
          likes_count?: number
          name?: string
          position?: number
          price?: number
          rating?: number
          restaurant_id?: string
          show_rating?: boolean
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dishes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dishes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          dish_id: string
          dish_name: string
          id: string
          notes: string | null
          order_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          dish_id: string
          dish_name: string
          id?: string
          notes?: string | null
          order_id: string
          quantity: number
          unit_price: number
        }
        Update: {
          created_at?: string
          dish_id?: string
          dish_name?: string
          id?: string
          notes?: string | null
          order_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_dish_id_fkey"
            columns: ["dish_id"]
            isOneToOne: false
            referencedRelation: "dishes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          created_by_alias: string | null
          created_by_diner_id: string | null
          delivered_at: string | null
          id: string
          notes: string | null
          restaurant_id: string
          session_id: string
          status: Database["public"]["Enums"]["order_status"]
          table_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_alias?: string | null
          created_by_diner_id?: string | null
          delivered_at?: string | null
          id?: string
          notes?: string | null
          restaurant_id: string
          session_id: string
          status?: Database["public"]["Enums"]["order_status"]
          table_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_alias?: string | null
          created_by_diner_id?: string | null
          delivered_at?: string | null
          id?: string
          notes?: string | null
          restaurant_id?: string
          session_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          table_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_created_by_diner_id_fkey"
            columns: ["created_by_diner_id"]
            isOneToOne: false
            referencedRelation: "diners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "table_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      restaurant_business_days: {
        Row: {
          day_of_week: number
          id: string
          is_closed: boolean
          restaurant_id: string
        }
        Insert: {
          day_of_week: number
          id?: string
          is_closed?: boolean
          restaurant_id: string
        }
        Update: {
          day_of_week?: number
          id?: string
          is_closed?: boolean
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_business_days_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_business_hour_intervals: {
        Row: {
          business_day_id: string
          close_time: string
          id: string
          open_time: string
          position: number
        }
        Insert: {
          business_day_id: string
          close_time: string
          id?: string
          open_time: string
          position: number
        }
        Update: {
          business_day_id?: string
          close_time?: string
          id?: string
          open_time?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_business_hour_intervals_business_day_id_fkey"
            columns: ["business_day_id"]
            isOneToOne: false
            referencedRelation: "restaurant_business_days"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          allow_reviews: boolean
          bio: string | null
          created_at: string
          cuisine_template: Database["public"]["Enums"]["cuisine_template"]
          delivery_links: Json
          hours: string | null
          id: string
          instagram_link: string | null
          logo_url: string | null
          menu_layout: string
          menu_theme: string
          name: string
          owner_id: string | null
          phone: string | null
          show_by_rating: boolean
          show_rating: boolean
          slug: string
          status: Database["public"]["Enums"]["restaurant_status"]
          updated_at: string
          whatsapp_enabled: boolean
          whatsapp_link: string | null
        }
        Insert: {
          address?: string | null
          allow_reviews?: boolean
          bio?: string | null
          created_at?: string
          cuisine_template?: Database["public"]["Enums"]["cuisine_template"]
          delivery_links?: Json
          hours?: string | null
          id?: string
          instagram_link?: string | null
          logo_url?: string | null
          menu_layout?: string
          menu_theme?: string
          name: string
          owner_id?: string | null
          phone?: string | null
          show_by_rating?: boolean
          show_rating?: boolean
          slug: string
          status?: Database["public"]["Enums"]["restaurant_status"]
          updated_at?: string
          whatsapp_enabled?: boolean
          whatsapp_link?: string | null
        }
        Update: {
          address?: string | null
          allow_reviews?: boolean
          bio?: string | null
          created_at?: string
          cuisine_template?: Database["public"]["Enums"]["cuisine_template"]
          delivery_links?: Json
          hours?: string | null
          id?: string
          instagram_link?: string | null
          logo_url?: string | null
          menu_layout?: string
          menu_theme?: string
          name?: string
          owner_id?: string | null
          phone?: string | null
          show_by_rating?: boolean
          show_rating?: boolean
          slug?: string
          status?: Database["public"]["Enums"]["restaurant_status"]
          updated_at?: string
          whatsapp_enabled?: boolean
          whatsapp_link?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_name: string | null
          comment: string | null
          created_at: string
          dish_id: string | null
          id: string
          rating: number
          restaurant_id: string
          user_id: string | null
        }
        Insert: {
          author_name?: string | null
          comment?: string | null
          created_at?: string
          dish_id?: string | null
          id?: string
          rating: number
          restaurant_id: string
          user_id?: string | null
        }
        Update: {
          author_name?: string | null
          comment?: string | null
          created_at?: string
          dish_id?: string | null
          id?: string
          rating?: number
          restaurant_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      shared_cart_items: {
        Row: {
          added_by_device: string
          added_by_name: string | null
          cart_id: string
          created_at: string
          dish_id: string
          id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          added_by_device: string
          added_by_name?: string | null
          cart_id: string
          created_at?: string
          dish_id: string
          id?: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          added_by_device?: string
          added_by_name?: string | null
          cart_id?: string
          created_at?: string
          dish_id?: string
          id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "shared_carts"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_carts: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          host_device_id: string
          host_name: string | null
          id: string
          restaurant_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          host_device_id: string
          host_name?: string | null
          id?: string
          restaurant_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          host_device_id?: string
          host_name?: string | null
          id?: string
          restaurant_id?: string
        }
        Relationships: []
      }
      table_sessions: {
        Row: {
          closed_at: string | null
          code: string
          created_at: string
          id: string
          opened_at: string
          opened_by_waiter_id: string | null
          restaurant_id: string
          status: Database["public"]["Enums"]["table_session_status"]
          table_id: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          code: string
          created_at?: string
          id?: string
          opened_at?: string
          opened_by_waiter_id?: string | null
          restaurant_id: string
          status?: Database["public"]["Enums"]["table_session_status"]
          table_id: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          code?: string
          created_at?: string
          id?: string
          opened_at?: string
          opened_by_waiter_id?: string | null
          restaurant_id?: string
          status?: Database["public"]["Enums"]["table_session_status"]
          table_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_sessions_opened_by_waiter_id_fkey"
            columns: ["opened_by_waiter_id"]
            isOneToOne: false
            referencedRelation: "waiters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_sessions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          capacity: number | null
          created_at: string
          created_by_waiter_id: string | null
          id: string
          is_active: boolean
          label: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          created_by_waiter_id?: string | null
          id?: string
          is_active?: boolean
          label: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          created_by_waiter_id?: string | null
          id?: string
          is_active?: boolean
          label?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tables_created_by_waiter_id_fkey"
            columns: ["created_by_waiter_id"]
            isOneToOne: false
            referencedRelation: "waiters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waiter_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          revoked_at: string | null
          token_hash: string
          waiter_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          revoked_at?: string | null
          token_hash: string
          waiter_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          revoked_at?: string | null
          token_hash?: string
          waiter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiter_sessions_waiter_id_fkey"
            columns: ["waiter_id"]
            isOneToOne: false
            referencedRelation: "waiters"
            referencedColumns: ["id"]
          },
        ]
      }
      waiters: {
        Row: {
          created_at: string
          created_by: string | null
          display_name: string
          id: string
          is_active: boolean
          last_login_at: string | null
          pin_hash: string
          restaurant_id: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          pin_hash: string
          restaurant_id: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          pin_hash?: string
          restaurant_id?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_dish_likes: { Args: { _dish_id: string }; Returns: number }
      get_user_id_by_email: { Args: { _email: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_dish_likes: { Args: { _dish_id: string }; Returns: number }
      list_users_with_roles: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          email: string
          id: string
          roles: Database["public"]["Enums"]["app_role"][]
        }[]
      }
      recalc_dish_rating: { Args: { _dish_id: string }; Returns: undefined }
      save_restaurant_business_hours: {
        Args: { p_restaurant_id: string; p_week: Json }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "owner" | "customer"
      cuisine_template:
        | "mexican"
        | "italian"
        | "chinese"
        | "japanese"
        | "generic"
      dish_event_type:
        | "view"
        | "cart_add"
        | "category_view"
        | "whatsapp_clicked"
        | "menu_view"
        | "dish_view"
        | "selection_add"
      order_status:
        | "pending"
        | "preparing"
        | "ready"
        | "delivered"
        | "cancelled"
      restaurant_status: "draft" | "published"
      table_session_status: "open" | "closed"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "owner", "customer"],
      cuisine_template: [
        "mexican",
        "italian",
        "chinese",
        "japanese",
        "generic",
      ],
      dish_event_type: [
        "view",
        "cart_add",
        "category_view",
        "whatsapp_clicked",
        "menu_view",
        "dish_view",
        "selection_add",
      ],
      order_status: ["pending", "preparing", "ready", "delivered", "cancelled"],
      restaurant_status: ["draft", "published"],
      table_session_status: ["open", "closed"],
    },
  },
} as const

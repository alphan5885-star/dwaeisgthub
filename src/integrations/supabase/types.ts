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
      account_lockouts: {
        Row: {
          email: string
          failed_count: number
          id: string
          last_attempt: string
          locked_until: string | null
          updated_at: string
        }
        Insert: {
          email: string
          failed_count?: number
          id?: string
          last_attempt?: string
          locked_until?: string | null
          updated_at?: string
        }
        Update: {
          email?: string
          failed_count?: number
          id?: string
          last_attempt?: string
          locked_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_auto_withdraw: {
        Row: {
          admin_id: string
          available: number | null
          cold_wallet: string | null
          created_at: string
          enabled: boolean | null
          id: string
          threshold: number | null
        }
        Insert: {
          admin_id: string
          available?: number | null
          cold_wallet?: string | null
          created_at?: string
          enabled?: boolean | null
          id?: string
          threshold?: number | null
        }
        Update: {
          admin_id?: string
          available?: number | null
          cold_wallet?: string | null
          created_at?: string
          enabled?: boolean | null
          id?: string
          threshold?: number | null
        }
        Relationships: []
      }
      anti_phishing_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_room_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_system: boolean
          room_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_system?: boolean
          room_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_system?: boolean
          room_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      dead_drop_locations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          latitude: number | null
          longitude: number | null
          order_id: string
          status: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          order_id: string
          status?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          order_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dead_drop_locations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_messages: {
        Row: {
          created_at: string
          dispute_id: string
          id: string
          message: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          dispute_id: string
          id?: string
          message: string
          sender_id: string
        }
        Update: {
          created_at?: string
          dispute_id?: string
          id?: string
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_messages_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          amount: number | null
          buyer_id: string
          created_at: string
          id: string
          order_id: string | null
          product_name: string | null
          reason: string | null
          resolution: string | null
          seller_id: string
          status: string | null
        }
        Insert: {
          amount?: number | null
          buyer_id: string
          created_at?: string
          id?: string
          order_id?: string | null
          product_name?: string | null
          reason?: string | null
          resolution?: string | null
          seller_id: string
          status?: string | null
        }
        Update: {
          amount?: number | null
          buyer_id?: string
          created_at?: string
          id?: string
          order_id?: string | null
          product_name?: string | null
          reason?: string | null
          resolution?: string | null
          seller_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      encrypted_messages: {
        Row: {
          ciphertext: string
          created_at: string
          id: string
          iv: string
          order_id: string
          sender_id: string
        }
        Insert: {
          ciphertext: string
          created_at?: string
          id?: string
          iv: string
          order_id: string
          sender_id: string
        }
        Update: {
          ciphertext?: string
          created_at?: string
          id?: string
          iv?: string
          order_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      escrow_pool: {
        Row: {
          amount: number | null
          commission: number | null
          created_at: string
          id: string
          order_id: string | null
          status: string | null
        }
        Insert: {
          amount?: number | null
          commission?: number | null
          created_at?: string
          id?: string
          order_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number | null
          commission?: number | null
          created_at?: string
          id?: string
          order_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escrow_pool_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          author_id: string
          category: string | null
          content: string
          created_at: string
          id: string
          pinned: boolean | null
          title: string
        }
        Insert: {
          author_id: string
          category?: string | null
          content: string
          created_at?: string
          id?: string
          pinned?: boolean | null
          title: string
        }
        Update: {
          author_id?: string
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean | null
          title?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      order_chat_rooms: {
        Row: {
          created_at: string
          id: string
          order_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          buyer_id: string
          created_at: string
          delivery_method: string | null
          id: string
          notes: string | null
          payment_status: string | null
          product_id: string | null
          service_fee: number | null
          shipping_address: string | null
          status: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount?: number
          buyer_id: string
          created_at?: string
          delivery_method?: string | null
          id?: string
          notes?: string | null
          payment_status?: string | null
          product_id?: string | null
          service_fee?: number | null
          shipping_address?: string | null
          status?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          created_at?: string
          delivery_method?: string | null
          id?: string
          notes?: string | null
          payment_status?: string | null
          product_id?: string | null
          service_fee?: number | null
          shipping_address?: string | null
          status?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          commission_rate: number | null
          created_at: string
          delivery_data: string | null
          description: string | null
          destination: string | null
          id: string
          image_emoji: string | null
          image_url: string | null
          is_active: boolean | null
          name: string | null
          origin: string | null
          price: number
          stock: number | null
          title: string
          tracking_number: string | null
          type: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          category?: string | null
          commission_rate?: number | null
          created_at?: string
          delivery_data?: string | null
          description?: string | null
          destination?: string | null
          id?: string
          image_emoji?: string | null
          image_url?: string | null
          is_active?: boolean | null
          name?: string | null
          origin?: string | null
          price?: number
          stock?: number | null
          title: string
          tracking_number?: string | null
          type?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          category?: string | null
          commission_rate?: number | null
          created_at?: string
          delivery_data?: string | null
          description?: string | null
          destination?: string | null
          id?: string
          image_emoji?: string | null
          image_url?: string | null
          is_active?: boolean | null
          name?: string | null
          origin?: string | null
          price?: number
          stock?: number | null
          title?: string
          tracking_number?: string | null
          type?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          count: number
          created_at: string
          id: string
          identifier: string
          window_start: string
        }
        Insert: {
          action: string
          count?: number
          created_at?: string
          id?: string
          identifier: string
          window_start?: string
        }
        Update: {
          action?: string
          count?: number
          created_at?: string
          id?: string
          identifier?: string
          window_start?: string
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          created_at: string
          device: string | null
          id: string
          ip: string | null
          success: boolean | null
          user_email: string | null
        }
        Insert: {
          created_at?: string
          device?: string | null
          id?: string
          ip?: string | null
          success?: boolean | null
          user_email?: string | null
        }
        Update: {
          created_at?: string
          device?: string | null
          id?: string
          ip?: string | null
          success?: boolean | null
          user_email?: string | null
        }
        Relationships: []
      }
      shipping_tracking: {
        Row: {
          carrier: string | null
          created_at: string
          estimated_delivery: string | null
          id: string
          order_id: string
          status: string | null
          tracking_number: string | null
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          estimated_delivery?: string | null
          id?: string
          order_id: string
          status?: string | null
          tracking_number?: string | null
        }
        Update: {
          carrier?: string | null
          created_at?: string
          estimated_delivery?: string | null
          id?: string
          order_id?: string
          status?: string | null
          tracking_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_tracking_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          reference: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          reference?: string | null
          status?: string
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          reference?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_balances: {
        Row: {
          available: number
          id: string
          pending: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available?: number
          id?: string
          pending?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available?: number
          id?: string
          pending?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_pgp_keys: {
        Row: {
          created_at: string
          fingerprint: string
          id: string
          key_id: string | null
          public_key: string
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          fingerprint: string
          id?: string
          key_id?: string | null
          public_key: string
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          fingerprint?: string
          id?: string
          key_id?: string | null
          public_key?: string
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
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
      vendor_bonds: {
        Row: {
          amount: number | null
          created_at: string
          id: string
          status: string | null
          vendor_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          id?: string
          status?: string | null
          vendor_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          id?: string
          status?: string | null
          vendor_id?: string
        }
        Relationships: []
      }
      vendor_ratings: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          order_id: string | null
          rating: number
          review: string | null
          vendor_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          order_id?: string | null
          rating: number
          review?: string | null
          vendor_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          order_id?: string | null
          rating?: number
          review?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_wallets: {
        Row: {
          available: number
          commission: number
          id: string
          pending: number
          total: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          available?: number
          commission?: number
          id?: string
          pending?: number
          total?: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          available?: number
          commission?: number
          id?: string
          pending?: number
          total?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_role_on_signup: { Args: { _role: string }; Returns: undefined }
      check_rate_limit: {
        Args: {
          _action: string
          _identifier: string
          _max_count: number
          _window_seconds: number
        }
        Returns: Json
      }
      confirm_delivery: { Args: { _order_id: string }; Returns: undefined }
      create_admin_user: { Args: never; Returns: undefined }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      get_vendor_rating: {
        Args: { _vendor_id: string }
        Returns: {
          avg_rating: number
          total_ratings: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_account_locked: { Args: { _email: string }; Returns: Json }
      panic_destroy: { Args: never; Returns: undefined }
      record_login_attempt: {
        Args: { _email: string; _success: boolean }
        Returns: Json
      }
      release_escrow: { Args: { _order_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "vendor" | "buyer"
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
      app_role: ["admin", "vendor", "buyer"],
    },
  },
} as const

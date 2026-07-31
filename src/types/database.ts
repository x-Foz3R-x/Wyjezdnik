export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      expenses: {
        Row: {
          amount: number;
          created_at: string | null;
          created_by: string | null;
          currency: string;
          date: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          description: string;
          entry_type: string;
          id: string;
          settlement_confirmed_at: string | null;
          settlement_confirmed_by: string | null;
          settlement_recipient_id: string | null;
          settlement_status: string | null;
          split_among: string[];
          trip_id: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string | null;
          created_by?: string | null;
          currency?: string;
          date?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          description: string;
          entry_type?: string;
          id?: string;
          settlement_confirmed_at?: string | null;
          settlement_confirmed_by?: string | null;
          settlement_recipient_id?: string | null;
          settlement_status?: string | null;
          split_among: string[];
          trip_id: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string | null;
          created_by?: string | null;
          currency?: string;
          date?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          description?: string;
          entry_type?: string;
          id?: string;
          settlement_confirmed_at?: string | null;
          settlement_confirmed_by?: string | null;
          settlement_recipient_id?: string | null;
          settlement_status?: string | null;
          split_among?: string[];
          trip_id?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_deleted_by_fkey";
            columns: ["deleted_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_payer_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_settlement_confirmed_by_fkey";
            columns: ["settlement_confirmed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_settlement_recipient_id_fkey";
            columns: ["settlement_recipient_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      expense_shares: {
        Row: {
          amount: number;
          created_at: string;
          expense_id: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          expense_id: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          expense_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expense_shares_expense_id_fkey";
            columns: ["expense_id"];
            isOneToOne: false;
            referencedRelation: "expenses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expense_shares_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      expense_revisions: {
        Row: {
          action: string;
          changed_by: string | null;
          created_at: string;
          expense_id: string;
          id: string;
          previous_data: Json;
          trip_id: string;
        };
        Insert: {
          action: string;
          changed_by?: string | null;
          created_at?: string;
          expense_id: string;
          id?: string;
          previous_data: Json;
          trip_id: string;
        };
        Update: {
          action?: string;
          changed_by?: string | null;
          created_at?: string;
          expense_id?: string;
          id?: string;
          previous_data?: Json;
          trip_id?: string;
        };
        Relationships: [];
      };
      game_challenge_entries: {
        Row: {
          challenge_id: string;
          claimed_at: string;
          completed_by: string | null;
          completed_at: string | null;
          id: string;
          status: string;
          team_id: string | null;
          user_id: string | null;
        };
        Insert: {
          challenge_id: string;
          claimed_at?: string;
          completed_by?: string | null;
          completed_at?: string | null;
          id?: string;
          status?: string;
          team_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          challenge_id?: string;
          claimed_at?: string;
          completed_by?: string | null;
          completed_at?: string | null;
          id?: string;
          status?: string;
          team_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      game_challenges: {
        Row: {
          audience: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          is_active: boolean;
          points: number;
          title: string;
          trip_id: string;
          updated_at: string;
        };
        Insert: {
          audience?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          points?: number;
          title: string;
          trip_id: string;
          updated_at?: string;
        };
        Update: {
          audience?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          points?: number;
          title?: string;
          trip_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      poll_options: {
        Row: {
          id: string;
          label: string;
          poll_id: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          label: string;
          poll_id: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          label?: string;
          poll_id?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      poll_votes: {
        Row: {
          created_at: string;
          id: string;
          option_id: string;
          poll_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          option_id: string;
          poll_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          option_id?: string;
          poll_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      polls: {
        Row: {
          closes_on: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          question: string;
          status: string;
          trip_id: string;
          updated_at: string;
        };
        Insert: {
          closes_on?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          question: string;
          status?: string;
          trip_id: string;
          updated_at?: string;
        };
        Update: {
          closes_on?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          question?: string;
          status?: string;
          trip_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      packing_item_states: {
        Row: {
          is_checked: boolean;
          is_hidden: boolean;
          item_key: string;
          trip_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          is_checked?: boolean;
          is_hidden?: boolean;
          item_key: string;
          trip_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          is_checked?: boolean;
          is_hidden?: boolean;
          item_key?: string;
          trip_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      packing_personal_items: {
        Row: {
          category: string;
          created_at: string;
          id: string;
          is_checked: boolean;
          label: string;
          sort_order: number;
          trip_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category?: string;
          created_at?: string;
          id?: string;
          is_checked?: boolean;
          label: string;
          sort_order?: number;
          trip_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          id?: string;
          is_checked?: boolean;
          label?: string;
          sort_order?: number;
          trip_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      schedule_items: {
        Row: {
          created_at: string;
          created_by: string | null;
          end_time: string | null;
          event_date: string;
          id: string;
          location_address: string | null;
          location_name: string | null;
          notes: string | null;
          start_time: string | null;
          title: string;
          trip_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          end_time?: string | null;
          event_date: string;
          id?: string;
          location_address?: string | null;
          location_name?: string | null;
          notes?: string | null;
          start_time?: string | null;
          title: string;
          trip_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          end_time?: string | null;
          event_date?: string;
          id?: string;
          location_address?: string | null;
          location_name?: string | null;
          notes?: string | null;
          start_time?: string | null;
          title?: string;
          trip_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      shopping_list: {
        Row: {
          added_by: string;
          claimed_at: string | null;
          claimed_by: string | null;
          completed_at: string | null;
          completed_by: string | null;
          created_at: string;
          for_users: string[];
          id: string;
          is_completed: boolean;
          item_name: string;
          trip_id: string;
          updated_at: string;
        };
        Insert: {
          added_by: string;
          claimed_at?: string | null;
          claimed_by?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          for_users?: string[];
          id?: string;
          is_completed?: boolean;
          item_name: string;
          trip_id: string;
          updated_at?: string;
        };
        Update: {
          added_by?: string;
          claimed_at?: string | null;
          claimed_by?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          for_users?: string[];
          id?: string;
          is_completed?: boolean;
          item_name?: string;
          trip_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shopping_list_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shopping_list_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      teams: {
        Row: {
          color_hex: string | null;
          created_at: string | null;
          id: string;
          name: string;
          score: number | null;
          trip_id: string;
          updated_at: string | null;
        };
        Insert: {
          color_hex?: string | null;
          created_at?: string | null;
          id?: string;
          name: string;
          score?: number | null;
          trip_id: string;
          updated_at?: string | null;
        };
        Update: {
          color_hex?: string | null;
          created_at?: string | null;
          id?: string;
          name?: string;
          score?: number | null;
          trip_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "teams_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      trips: {
        Row: {
          closed_at: string | null;
          closed_by: string | null;
          created_at: string | null;
          dashboard_widgets: Json;
          default_currency: string;
          destination_address: string | null;
          destination_map_url: string | null;
          destination_name: string | null;
          end_date: string | null;
          expense_viewer_ids: string[];
          expense_visibility: string;
          finance_mode: string;
          id: string;
          invite_token: string;
          join_pin: string;
          layout_config: Json;
          modules: Json | null;
          name: string;
          packing_presets: Json;
          playlist_url: string | null;
          settlement_strategy: string;
          start_date: string | null;
          status: string;
          theme: string | null;
          updated_at: string | null;
          url_key: string;
        };
        Insert: {
          closed_at?: string | null;
          closed_by?: string | null;
          created_at?: string | null;
          dashboard_widgets?: Json;
          default_currency?: string;
          destination_address?: string | null;
          destination_map_url?: string | null;
          destination_name?: string | null;
          end_date?: string | null;
          expense_viewer_ids?: string[];
          expense_visibility?: string;
          finance_mode?: string;
          id?: string;
          invite_token?: string;
          join_pin?: string;
          layout_config?: Json;
          modules?: Json | null;
          name: string;
          packing_presets?: Json;
          playlist_url?: string | null;
          settlement_strategy?: string;
          start_date?: string | null;
          status?: string;
          theme?: string | null;
          updated_at?: string | null;
          url_key?: string;
        };
        Update: {
          closed_at?: string | null;
          closed_by?: string | null;
          created_at?: string | null;
          dashboard_widgets?: Json;
          default_currency?: string;
          destination_address?: string | null;
          destination_map_url?: string | null;
          destination_name?: string | null;
          end_date?: string | null;
          expense_viewer_ids?: string[];
          expense_visibility?: string;
          finance_mode?: string;
          id?: string;
          invite_token?: string;
          join_pin?: string;
          layout_config?: Json;
          modules?: Json | null;
          name?: string;
          packing_presets?: Json;
          playlist_url?: string | null;
          settlement_strategy?: string;
          start_date?: string | null;
          status?: string;
          theme?: string | null;
          updated_at?: string | null;
          url_key?: string;
        };
        Relationships: [];
      };
      trip_status_events: {
        Row: {
          changed_by: string | null;
          created_at: string;
          id: string;
          status: string;
          trip_id: string;
        };
        Insert: {
          changed_by?: string | null;
          created_at?: string;
          id?: string;
          status: string;
          trip_id: string;
        };
        Update: {
          changed_by?: string | null;
          created_at?: string;
          id?: string;
          status?: string;
          trip_id?: string;
        };
        Relationships: [];
      };
      trip_playlists: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          sort_order: number;
          trip_id: string;
          updated_at: string;
          url: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          sort_order?: number;
          trip_id: string;
          updated_at?: string;
          url: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
          sort_order?: number;
          trip_id?: string;
          updated_at?: string;
          url?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          id: string;
          is_admin: boolean;
          last_seen_at: string | null;
          name: string;
          payment_note: string | null;
          phone: string | null;
          revolut_url: string | null;
          team_id: string | null;
          trip_id: string;
          updated_at: string | null;
          user_pin: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          id?: string;
          is_admin?: boolean;
          last_seen_at?: string | null;
          name: string;
          payment_note?: string | null;
          phone?: string | null;
          revolut_url?: string | null;
          team_id?: string | null;
          trip_id: string;
          updated_at?: string | null;
          user_pin?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          id?: string;
          is_admin?: boolean;
          last_seen_at?: string | null;
          name?: string;
          payment_note?: string | null;
          phone?: string | null;
          revolut_url?: string | null;
          team_id?: string | null;
          trip_id?: string;
          updated_at?: string | null;
          user_pin?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_team";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "users_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_expense_entry: {
        Args: {
          p_amount: number;
          p_created_by: string;
          p_currency: string;
          p_description: string;
          p_payer_id: string;
          p_shares?: Json;
          p_split_among: string[];
          p_trip_id: string;
        };
        Returns: string;
      };
      delete_trip_permanently: {
        Args: {
          p_confirmation_name: string;
          p_deleted_by: string;
          p_trip_id: string;
        };
        Returns: undefined;
      };
      complete_game_challenge: {
        Args: {
          p_completed_by: string;
          p_entry_id: string;
          p_trip_id: string;
        };
        Returns: Json;
      };
      set_trip_status: {
        Args: {
          p_changed_by: string;
          p_status: string;
          p_trip_id: string;
        };
        Returns: undefined;
      };
      soft_delete_expense_entry: {
        Args: {
          p_changed_by: string;
          p_expense_id: string;
          p_trip_id: string;
        };
        Returns: undefined;
      };
      update_expense_entry: {
        Args: {
          p_amount: number;
          p_changed_by: string;
          p_currency: string;
          p_description: string;
          p_expense_id: string;
          p_payer_id: string;
          p_shares?: Json;
          p_split_among: string[];
          p_trip_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;

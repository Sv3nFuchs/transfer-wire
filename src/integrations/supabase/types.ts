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
      clubs: {
        Row: {
          city: string | null
          country: string
          country_code: string | null
          created_at: string
          created_by: string | null
          description: string | null
          everysport_id: string | null
          founded_year: number | null
          id: string
          level: string | null
          logo_url: string | null
          name: string
          org_type: string
        }
        Insert: {
          city?: string | null
          country?: string
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          everysport_id?: string | null
          founded_year?: number | null
          id?: string
          level?: string | null
          logo_url?: string | null
          name: string
          org_type?: string
        }
        Update: {
          city?: string | null
          country?: string
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          everysport_id?: string | null
          founded_year?: number | null
          id?: string
          level?: string | null
          logo_url?: string | null
          name?: string
          org_type?: string
        }
        Relationships: []
      }
      match_player_ratings: {
        Row: {
          created_at: string
          created_by: string | null
          goals_scored: number
          id: string
          match_id: string
          player_id: string
          rating: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          goals_scored?: number
          id?: string
          match_id: string
          player_id: string
          rating?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          goals_scored?: number
          id?: string
          match_id?: string
          player_id?: string
          rating?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_player_ratings_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_player_ratings_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          competition: string | null
          created_at: string
          created_by: string | null
          external_id: string | null
          external_source: string | null
          home_away: string
          id: string
          match_date: string
          notes: string | null
          opponent_club_id: string | null
          opponent_name: string
          opponent_score: number | null
          team_id: string
          team_score: number | null
          updated_at: string
        }
        Insert: {
          competition?: string | null
          created_at?: string
          created_by?: string | null
          external_id?: string | null
          external_source?: string | null
          home_away?: string
          id?: string
          match_date: string
          notes?: string | null
          opponent_club_id?: string | null
          opponent_name: string
          opponent_score?: number | null
          team_id: string
          team_score?: number | null
          updated_at?: string
        }
        Update: {
          competition?: string | null
          created_at?: string
          created_by?: string | null
          external_id?: string | null
          external_source?: string | null
          home_away?: string
          id?: string
          match_date?: string
          notes?: string | null
          opponent_club_id?: string | null
          opponent_name?: string
          opponent_score?: number | null
          team_id?: string
          team_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_opponent_club_id_fkey"
            columns: ["opponent_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      player_season_stats: {
        Row: {
          average_rating: number | null
          goals: number
          id: string
          league: string | null
          matches_played: number
          player_id: string
          rated_matches: number
          season: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          average_rating?: number | null
          goals?: number
          id?: string
          league?: string | null
          matches_played?: number
          player_id: string
          rated_matches?: number
          season?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          average_rating?: number | null
          goals?: number
          id?: string
          league?: string | null
          matches_played?: number
          player_id?: string
          rated_matches?: number
          season?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_season_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_season_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          bio: string | null
          birth_year: number | null
          birthplace: string | null
          birthplace_country_code: string | null
          club_id: string | null
          created_at: string
          created_by: string | null
          flag_1: string | null
          flag_2: string | null
          full_name: string
          height_cm: number | null
          id: string
          nationality: string | null
          position: string | null
          preferred_foot: string | null
          shirt_number: number | null
          team_id: string | null
        }
        Insert: {
          bio?: string | null
          birth_year?: number | null
          birthplace?: string | null
          birthplace_country_code?: string | null
          club_id?: string | null
          created_at?: string
          created_by?: string | null
          flag_1?: string | null
          flag_2?: string | null
          full_name: string
          height_cm?: number | null
          id?: string
          nationality?: string | null
          position?: string | null
          preferred_foot?: string | null
          shirt_number?: number | null
          team_id?: string | null
        }
        Update: {
          bio?: string | null
          birth_year?: number | null
          birthplace?: string | null
          birthplace_country_code?: string | null
          club_id?: string | null
          created_at?: string
          created_by?: string | null
          flag_1?: string | null
          flag_2?: string | null
          full_name?: string
          height_cm?: number | null
          id?: string
          nationality?: string | null
          position?: string | null
          preferred_foot?: string | null
          shirt_number?: number | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          age_group: string | null
          club_id: string
          created_at: string
          created_by: string | null
          everysport_url: string | null
          id: string
          league: string | null
          name: string
          season: string | null
        }
        Insert: {
          age_group?: string | null
          club_id: string
          created_at?: string
          created_by?: string | null
          everysport_url?: string | null
          id?: string
          league?: string | null
          name: string
          season?: string | null
        }
        Update: {
          age_group?: string | null
          club_id?: string
          created_at?: string
          created_by?: string | null
          everysport_url?: string | null
          id?: string
          league?: string | null
          name?: string
          season?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          created_at: string
          created_by: string | null
          from_club_id: string | null
          from_club_name: string | null
          id: string
          note: string | null
          org_type: string
          player_id: string
          to_club_id: string | null
          to_club_name: string | null
          transfer_date: string | null
          transfer_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_club_id?: string | null
          from_club_name?: string | null
          id?: string
          note?: string | null
          org_type?: string
          player_id: string
          to_club_id?: string | null
          to_club_name?: string | null
          transfer_date?: string | null
          transfer_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_club_id?: string | null
          from_club_name?: string | null
          id?: string
          note?: string | null
          org_type?: string
          player_id?: string
          to_club_id?: string | null
          to_club_name?: string | null
          transfer_date?: string | null
          transfer_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_from_club_id_fkey"
            columns: ["from_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_club_id_fkey"
            columns: ["to_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
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
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

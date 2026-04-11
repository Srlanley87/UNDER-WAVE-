export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          bio: string | null;
          has_uploaded: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          avatar_url?: string | null;
          bio?: string | null;
          has_uploaded?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          avatar_url?: string | null;
          bio?: string | null;
          has_uploaded?: boolean;
          created_at?: string;
        };
      };
      tracks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          artist: string;
          cover_url: string | null;
          audio_url: string;
          genre: string | null;
          play_count: number;
          like_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          artist: string;
          cover_url?: string | null;
          audio_url: string;
          genre?: string | null;
          play_count?: number;
          like_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          artist?: string;
          cover_url?: string | null;
          audio_url?: string;
          genre?: string | null;
          play_count?: number;
          like_count?: number;
          created_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          track_id: string;
          user_id: string;
          timestamp_seconds: number;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          track_id: string;
          user_id: string;
          timestamp_seconds: number;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          track_id?: string;
          user_id?: string;
          timestamp_seconds?: number;
          body?: string;
          created_at?: string;
        };
      };
      play_events: {
        Row: {
          id: string;
          track_id: string;
          user_id: string | null;
          segment_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          track_id: string;
          user_id?: string | null;
          segment_index: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          track_id?: string;
          user_id?: string | null;
          segment_index?: number;
          created_at?: string;
        };
      };
      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Track = Database['public']['Tables']['tracks']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];
export type PlayEvent = Database['public']['Tables']['play_events']['Row'];
export type Follow = Database['public']['Tables']['follows']['Row'];

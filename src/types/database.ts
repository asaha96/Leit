// Database types for Leit
export interface Deck {
  id: string;
  title: string;
  tags: string[];
  source?: string;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  hints: string[];
  answers: string[];
  tags: string[];
  media_refs: any;
  due_at?: string | null;
  ease?: number | null;
  interval_days?: number | null;
  lapses?: number | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email?: string;
  external_sub?: string;
  display_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id?: string;
  deck_id?: string;
  score?: number;
  started_at: string;
  finished_at?: string;
}

export interface SessionEvent {
  id: string;
  session_id: string;
  card_id?: string;
  response?: string;
  correct?: boolean;
  ai_score?: number;
  quality?: string;
  next_due?: string;
  created_at: string;
}
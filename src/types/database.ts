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
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
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
  ai_score?: number;
  quality?: string;
  next_due?: string;
  created_at: string;
}
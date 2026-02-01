export interface Card {
  id: string;
  front: string;
  back: string;
  hint?: string;
  answers: string[];
  tags: string[];
}

export interface Deck {
  id: string;
  title: string;
  cards: Card[];
  tags: string[];
}

export interface SessionEntry {
  userId: string;
  cardId: string;
  response: string;
  score: number; // 0-1
  quality: 'again' | 'hard' | 'good' | 'easy';
  timestamp: number;
  nextDue: string; // ISO date string
  // Metadata for difficulty inference
  responseTimeMs?: number;
  hintUsed?: boolean;
  inferredQuality?: 'again' | 'hard' | 'good' | 'easy';
  inferenceConfidence?: number;
  userOverrode?: boolean;
}

export interface SessionStats {
  totalCards: number;
  correctAnswers: number;
  accuracy: number;
  averageScore: number;
}

export type MatchType = 'exact' | 'synonym' | 'word_order' | 'fuzzy' | 'ai' | 'none';

export interface EvaluationResult {
  score: number; // 0-1
  feedback: string;
  isCorrect: boolean;
  matchType?: MatchType;
  aiUsed?: boolean;
}

export interface AnswerMetadata {
  responseTimeMs: number;
  hintUsed: boolean;
  inferredQuality: 'again' | 'hard' | 'good' | 'easy';
  inferenceConfidence: number;
  userOverrode: boolean;
}
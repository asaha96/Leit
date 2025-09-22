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
}

export interface SessionStats {
  totalCards: number;
  correctAnswers: number;
  accuracy: number;
  averageScore: number;
}

export interface EvaluationResult {
  score: number; // 0-1
  feedback: string;
  isCorrect: boolean;
}
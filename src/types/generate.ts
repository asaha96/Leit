export interface GeneratedCard {
  id: string;
  front: string;
  back: string;
  hints: string[];
  answers: string[];
  tags: string[];
  selected: boolean;
}

export interface GenerateOptions {
  cardCount?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface GenerationResult {
  cards: GeneratedCard[];
  suggestedDeckName: string;
  contentSummary: string;
}

export interface PDFExtractResult {
  text: string;
  pageCount: number;
  charCount: number;
}

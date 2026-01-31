import { apiFetch } from '@/lib/api';
import type { GeneratedCard, GenerateOptions, GenerationResult, PDFExtractResult } from '@/types/generate';

export class AIFlashcardService {
  static async extractPDFText(file: File): Promise<PDFExtractResult | null> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Use raw fetch for multipart form data
      const apiBase = import.meta.env.VITE_API_ORIGIN
        ? import.meta.env.VITE_API_ORIGIN.replace(/\/$/, '') + '/api'
        : '/api';

      // Get token from the token getter (we need to access it through the auth hook)
      const token = await getAuthToken();

      const response = await fetch(`${apiBase}/generate/extract-pdf`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to extract PDF' }));
        throw new Error(error.error || 'Failed to extract PDF');
      }

      return await response.json();
    } catch (error) {
      console.error('Error extracting PDF:', error);
      throw error;
    }
  }

  static async generateFlashcards(
    content: string,
    options?: GenerateOptions
  ): Promise<GenerationResult | null> {
    try {
      const res = await apiFetch('/generate/flashcards', {
        method: 'POST',
        body: JSON.stringify({
          content,
          cardCount: options?.cardCount ?? 10,
          difficulty: options?.difficulty ?? 'medium',
        }),
      });

      return {
        cards: res.cards || [],
        suggestedDeckName: res.suggestedDeckName || 'Generated Flashcards',
        contentSummary: res.contentSummary || '',
      };
    } catch (error) {
      console.error('Error generating flashcards:', error);
      throw error;
    }
  }

  static async checkAvailability(): Promise<boolean> {
    try {
      const res = await apiFetch('/ai/status');
      return res.available === true;
    } catch (error) {
      console.error('Error checking AI status:', error);
      return false;
    }
  }
}

// Token getter - will be set by the component that uses this service
let tokenGetterFn: (() => Promise<string | null>) | null = null;

export const setAIFlashcardTokenGetter = (getter: () => Promise<string | null>) => {
  tokenGetterFn = getter;
};

async function getAuthToken(): Promise<string | null> {
  if (tokenGetterFn) {
    return tokenGetterFn();
  }
  return null;
}

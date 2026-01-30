import { apiFetch } from '@/lib/api';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class AIService {
  private static available: boolean | null = null;

  /**
   * Check if AI service is available (returns false if not configured)
   */
  static async isAvailable(): Promise<boolean> {
    if (this.available !== null) {
      return this.available;
    }

    try {
      const res = await fetch('/api/ai/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        this.available = false;
        return false;
      }
      const data = await res.json();
      this.available = data.available === true;
      return this.available;
    } catch {
      // AI not available - this is fine, features will be hidden
      this.available = false;
      return false;
    }
  }

  /**
   * Send a chat completion request to the AI
   */
  static async chat(messages: ChatMessage[], maxTokens = 500): Promise<string | null> {
    try {
      const res = await apiFetch('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages, max_tokens: maxTokens }),
      });

      const data = res as ChatResponse;
      return data.choices?.[0]?.message?.content || null;
    } catch (error) {
      console.error('AI chat error:', error);
      return null;
    }
  }

  /**
   * Generate a practice question from card content
   */
  static async generatePracticeQuestion(
    front: string,
    back: string,
    questionType: 'multiple_choice' | 'fill_blank' | 'short_answer' = 'short_answer'
  ): Promise<{ question: string; hints?: string[] } | null> {
    const typeInstructions = {
      multiple_choice: 'Create a multiple choice question with 4 options (A, B, C, D). Mark the correct answer.',
      fill_blank: 'Create a fill-in-the-blank question where the key term is replaced with ___.',
      short_answer: 'Create a short answer question that tests understanding of the concept.',
    };

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an educational assistant helping students learn through practice questions.
Generate a single practice question based on the flashcard content provided.
${typeInstructions[questionType]}
Keep the question clear and focused. Respond in JSON format: {"question": "...", "hints": ["...", "..."]}`,
      },
      {
        role: 'user',
        content: `Flashcard Front: ${front}\nFlashcard Back: ${back}\n\nGenerate a ${questionType.replace('_', ' ')} question.`,
      },
    ];

    const response = await this.chat(messages, 300);
    if (!response) return null;

    try {
      // Try to parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      // Fallback: use raw response as question
      return { question: response };
    } catch {
      return { question: response };
    }
  }

  /**
   * Get a hint for a flashcard
   */
  static async getHint(front: string, back: string): Promise<string | null> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a helpful tutor. Give a brief, encouraging hint that helps the student recall the answer without giving it away directly. Keep hints under 50 words.`,
      },
      {
        role: 'user',
        content: `The student is trying to remember the answer to: "${front}"\nThe answer is: "${back}"\nGive a helpful hint.`,
      },
    ];

    return this.chat(messages, 100);
  }

  /**
   * Explain why an answer is correct or incorrect
   */
  static async explainAnswer(
    question: string,
    correctAnswer: string,
    userAnswer: string,
    isCorrect: boolean
  ): Promise<string | null> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an encouraging tutor. ${
          isCorrect
            ? 'Briefly congratulate the student and reinforce why their answer is correct.'
            : 'Gently explain why the answer was incorrect and help them understand the correct answer.'
        } Keep explanations under 100 words.`,
      },
      {
        role: 'user',
        content: `Question: ${question}\nCorrect answer: ${correctAnswer}\nStudent's answer: ${userAnswer}`,
      },
    ];

    return this.chat(messages, 150);
  }
}

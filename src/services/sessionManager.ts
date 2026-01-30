import { DatabaseService } from './database';
import { evaluateAnswer } from '@/utils/evaluator';
import type { Session, SessionEvent, Card, User } from '@/types/database';
import type { Quality } from '@/utils/scheduler';

export class SessionManager {
  private sessionId: string | null = null;
  private currentUser: User | null = null;

  async initialize(): Promise<void> {
    this.currentUser = await DatabaseService.getCurrentUser();
  }

  async startSession(deckId: string): Promise<string | null> {
    if (!this.currentUser) {
      console.error('No user found for session');
      return null;
    }

    const session = await DatabaseService.createSession({
      user_id: this.currentUser.id,
      deck_id: deckId
    });

    if (session) {
      this.sessionId = session.id;
    }

    return this.sessionId;
  }

  async recordAnswer(
    cardId: string,
    response: string,
    quality: Quality,
    expectedAnswers: string[]
  ): Promise<{ score: number; feedback: string; isCorrect: boolean } | null> {
    if (!this.sessionId) {
      console.error('No active session');
      return null;
    }

    // Evaluate the answer
    const evaluation = evaluateAnswer(response, expectedAnswers);

    // Update card schedule on server and get server-computed due_at (SM-2)
    let nextDue: string;
    try {
      const updatedCard = await DatabaseService.updateCardSchedule(cardId, quality);
      // Use server's SM-2 computed due_at
      nextDue = updatedCard?.due_at || new Date().toISOString();
    } catch (err) {
      console.error('Failed to update card schedule', err);
      nextDue = new Date().toISOString();
    }

    // Record the event with server-derived next_due
    const event = await DatabaseService.createSessionEvent({
      session_id: this.sessionId,
      card_id: cardId,
      response,
      ai_score: evaluation.score,
      quality,
      next_due: nextDue
    });

    if (!event) {
      console.error('Failed to record session event');
      return null;
    }

    return evaluation;
  }

  async finishSession(): Promise<{ accuracy: number; totalCards: number; correctAnswers: number } | null> {
    if (!this.sessionId) {
      console.error('No active session to finish');
      return null;
    }

    // Get all events for this session
    const events = await DatabaseService.getSessionEvents(this.sessionId);
    
    // Calculate final score
    const totalCards = events.length;
    const correctAnswers = events.filter(e => (e.ai_score || 0) >= 0.9).length;
    const accuracy = totalCards > 0 ? correctAnswers / totalCards : 0;

    // Update session with final score
    await DatabaseService.finishSession(this.sessionId, accuracy);

    // Reset session
    this.sessionId = null;

    return {
      accuracy,
      totalCards,
      correctAnswers
    };
  }

  getCurrentSessionId(): string | null {
    return this.sessionId;
  }
}
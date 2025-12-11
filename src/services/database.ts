import type { Deck, Card, User, Session, SessionEvent } from '@/types/database';
import { apiFetch } from '@/lib/api';

export class DatabaseService {
  // Decks
  static async getDecks(): Promise<Deck[]> {
    try {
      const res = await apiFetch('/decks');
      return res.data || [];
    } catch (error) {
      console.error('Error fetching decks:', error);
      return [];
    }
  }

  // Users (local auth)
  static async getCurrentUser(): Promise<User | null> {
    try {
      const res = await apiFetch('/auth/me');
      return res.user || null;
    } catch (error) {
      console.error('Error fetching current user:', error);
      return null;
    }
  }

  static async getDeck(deckId: string): Promise<Deck | null> {
    try {
      const res = await apiFetch(`/decks/${deckId}`);
      return res.data || null;
    } catch (error) {
      console.error('Error fetching deck:', error);
      return null;
    }
  }

  static async createDeck(deck: Omit<Deck, 'id' | 'created_at' | 'updated_at'>): Promise<Deck | null> {
    try {
      const res = await apiFetch('/decks', {
        method: 'POST',
        body: JSON.stringify(deck),
      });
      return res.data || null;
    } catch (error) {
      console.error('Error creating deck:', error);
      return null;
    }
  }

  // Cards
  static async getCardsByDeck(deckId: string): Promise<Card[]> {
    try {
      const res = await apiFetch(`/decks/${deckId}/cards`);
      return res.data || [];
    } catch (error) {
      console.error('Error fetching cards:', error);
      return [];
    }
  }

  static async getAllCards(): Promise<Card[]> {
    try {
      const res = await apiFetch('/cards');
      return res.data || [];
    } catch (error) {
      console.error('Error fetching all cards:', error);
      return [];
    }
  }

  static async getDueCards(deckId: string, nowIso?: string): Promise<Card[]> {
    try {
      const now = nowIso ? new Date(nowIso) : new Date();
      const res = await apiFetch(`/decks/${deckId}/cards`);
      const cards: Card[] = res.data || [];
      return cards.filter((c) => {
        if (!c.due_at) return true; // treat unscheduled as due/new
        return new Date(c.due_at) <= now;
      });
    } catch (error) {
      console.error('Error fetching due cards:', error);
      return [];
    }
  }

  static async createCard(card: Omit<Card, 'id' | 'created_at' | 'updated_at'>): Promise<Card | null> {
    try {
      const res = await apiFetch('/cards', {
        method: 'POST',
        body: JSON.stringify(card),
      });
      return res.data || null;
    } catch (error) {
      console.error('Error creating card:', error);
      return null;
    }
  }

  static async createCards(cards: Omit<Card, 'id' | 'created_at' | 'updated_at'>[]): Promise<Card[]> {
    try {
      const res = await apiFetch('/cards/bulk', {
        method: 'POST',
        body: JSON.stringify({ cards }),
      });
      return res.data || [];
    } catch (error) {
      console.error('Error creating cards:', error);
      return [];
    }
  }

  // Sessions
  static async createSession(session: Omit<Session, 'id' | 'started_at'>): Promise<Session | null> {
    try {
      const res = await apiFetch('/sessions', {
        method: 'POST',
        body: JSON.stringify(session),
      });
      return res.data || null;
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  }

  static async finishSession(sessionId: string, score: number): Promise<boolean> {
    try {
      await apiFetch(`/sessions/${sessionId}/finish`, {
        method: 'PATCH',
        body: JSON.stringify({ score }),
      });
      return true;
    } catch (error) {
      console.error('Error finishing session:', error);
      return false;
    }
  }

  // Session Events
  static async createSessionEvent(event: Omit<SessionEvent, 'id' | 'created_at'>): Promise<SessionEvent | null> {
    try {
      const res = await apiFetch('/session-events', {
        method: 'POST',
        body: JSON.stringify(event),
      });
      return res.data || null;
    } catch (error) {
      console.error('Error creating session event:', error);
      return null;
    }
  }

  static async getSessionEvents(sessionId: string): Promise<SessionEvent[]> {
    try {
      const res = await apiFetch(`/sessions/${sessionId}/events`);
      return res.data || [];
    } catch (error) {
      console.error('Error fetching session events:', error);
      return [];
    }
  }

  static async getSessionsWithEvents(): Promise<(Session & { session_events: SessionEvent[] })[]> {
    try {
      const res = await apiFetch('/sessions?includeEvents=1');
      return res.data || [];
    } catch (error) {
      console.error('Error fetching sessions with events:', error);
      return [];
    }
  }

  static async updateCardSchedule(cardId: string, quality: 'again' | 'hard' | 'good' | 'easy') {
    try {
      const res = await apiFetch(`/cards/${cardId}/review`, {
        method: 'POST',
        body: JSON.stringify({ quality }),
      });
      return res.data;
    } catch (error) {
      console.error('Error updating card schedule:', error);
      return null;
    }
  }
}
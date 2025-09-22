import { supabase } from '@/integrations/supabase/client';
import type { Deck, Card, User, Session, SessionEvent } from '@/types/database';

export class DatabaseService {
  // Users
  static async getCurrentUser(): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('external_sub', 'local-demo-user')
      .single();
    
    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }
    
    return data;
  }

  // Decks
  static async getDecks(): Promise<Deck[]> {
    const { data, error } = await supabase
      .from('decks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching decks:', error);
      return [];
    }
    
    return data || [];
  }

  static async getDeck(deckId: string): Promise<Deck | null> {
    const { data, error } = await supabase
      .from('decks')
      .select('*')
      .eq('id', deckId)
      .single();
    
    if (error) {
      console.error('Error fetching deck:', error);
      return null;
    }
    
    return data;
  }

  static async createDeck(deck: Omit<Deck, 'id' | 'created_at' | 'updated_at'>): Promise<Deck | null> {
    const { data, error } = await supabase
      .from('decks')
      .insert(deck)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating deck:', error);
      return null;
    }
    
    return data;
  }

  // Cards
  static async getCardsByDeck(deckId: string): Promise<Card[]> {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('deck_id', deckId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching cards:', error);
      return [];
    }
    
    return data || [];
  }

  static async getDueCards(deckId: string): Promise<Card[]> {
    // For now, return all cards. Later we'll filter by next_due from session_events
    return this.getCardsByDeck(deckId);
  }

  static async createCard(card: Omit<Card, 'id' | 'created_at' | 'updated_at'>): Promise<Card | null> {
    const { data, error } = await supabase
      .from('cards')
      .insert(card)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating card:', error);
      return null;
    }
    
    return data;
  }

  static async createCards(cards: Omit<Card, 'id' | 'created_at' | 'updated_at'>[]): Promise<Card[]> {
    const { data, error } = await supabase
      .from('cards')
      .insert(cards)
      .select();
    
    if (error) {
      console.error('Error creating cards:', error);
      return [];
    }
    
    return data || [];
  }

  // Sessions
  static async createSession(session: Omit<Session, 'id' | 'started_at'>): Promise<Session | null> {
    const { data, error } = await supabase
      .from('sessions')
      .insert(session)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating session:', error);
      return null;
    }
    
    return data;
  }

  static async finishSession(sessionId: string, score: number): Promise<boolean> {
    const { error } = await supabase
      .from('sessions')
      .update({ 
        finished_at: new Date().toISOString(),
        score 
      })
      .eq('id', sessionId);
    
    if (error) {
      console.error('Error finishing session:', error);
      return false;
    }
    
    return true;
  }

  // Session Events
  static async createSessionEvent(event: Omit<SessionEvent, 'id' | 'created_at'>): Promise<SessionEvent | null> {
    const { data, error } = await supabase
      .from('session_events')
      .insert(event)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating session event:', error);
      return null;
    }
    
    return data;
  }

  static async getSessionEvents(sessionId: string): Promise<SessionEvent[]> {
    const { data, error } = await supabase
      .from('session_events')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching session events:', error);
      return [];
    }
    
    return data || [];
  }
}
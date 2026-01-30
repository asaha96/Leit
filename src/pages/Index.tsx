import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthPage } from '@/pages/Auth';
import { Dashboard } from '@/pages/Dashboard';
import { Practice } from '@/pages/Practice';
import { Navigation } from '@/components/Navigation';
import { DatabaseService } from '@/services/database';
import { SessionManager } from '@/services/sessionManager';
import { DeckPicker } from '@/components/DeckPicker';
import { FlashcardSession } from '@/components/FlashcardSession';
import { SessionComplete } from '@/components/SessionComplete';
import { useToast } from '@/hooks/use-toast';
import type { Card as FlashCard, SessionStats, SessionEntry } from '@/types/flashcard';

const Index = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('study');
  const [currentView, setCurrentView] = useState<'picker' | 'session' | 'complete'>('picker');
  const [currentDeckId, setCurrentDeckId] = useState<string | null>(null);
  const [currentCards, setCurrentCards] = useState<FlashCard[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [sessionManager] = useState(() => new SessionManager());
  const { toast } = useToast();

  // All hooks must be called before any early returns
  useEffect(() => {
    sessionManager.initialize();
  }, [sessionManager]);

  // Show loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/40 gap-4">
        <div className="animate-pulse">
          <div className="h-12 w-12 bg-primary/20 rounded-lg" />
        </div>
        <div className="text-lg text-muted-foreground">Loading Leit...</div>
      </div>
    );
  }

  // Show auth page if not logged in
  if (!user) {
    return <AuthPage />;
  }

  const handleDeckSelected = async (deckId: string, options?: { dueOnly?: boolean }) => {
    setCurrentDeckId(deckId);
    
    try {
      // Ensure session manager is initialized with current user
      await sessionManager.initialize();
      
      // Load cards for the deck
      const cards = options?.dueOnly
        ? await DatabaseService.getDueCards(deckId)
        : await DatabaseService.getCardsByDeck(deckId);
      if (cards.length === 0) {
        toast({
          title: "No Cards Available",
          description: "This deck has no cards to study.",
          variant: "destructive",
        });
        return;
      }

      // Convert database cards to flashcard format
      const flashcards = cards.map(card => ({
        id: card.id,
        front: card.front,
        back: card.back,
        hint: card.hints.length > 0 ? card.hints[0] : undefined,
        answers: card.answers.length > 0 ? card.answers : [card.back],
        tags: card.tags,
      }));

      setCurrentCards(flashcards);
      
      // Start session
      const sessionId = await sessionManager.startSession(deckId);
      if (sessionId) {
        setCurrentView('session');
        toast({
          title: "Session Started",
          description: `Starting study session with ${cards.length} cards.`,
        });
      } else {
        toast({
          title: "Session Error",
          description: "Failed to start session. Please try refreshing the page.",
          variant: "destructive",
        });
        console.error('Failed to start session - session ID is null');
      }
    } catch (error) {
      console.error('Error in handleDeckSelected:', error);
      toast({
        title: "Error",
        description: "An error occurred while starting the session.",
        variant: "destructive",
      });
    }
  };

  const handleSessionComplete = async (stats: SessionStats, sessionEntries: SessionEntry[]) => {
    try {
      // Show saving toast
      toast({
        title: "Saving session...",
        description: "Recording your progress",
      });

      // Record all session entries to database
      if (sessionManager.getCurrentSessionId()) {
        for (const entry of sessionEntries) {
          const card = currentCards.find(c => c.id === entry.cardId);
          if (card) {
            await sessionManager.recordAnswer(
              entry.cardId,
              entry.response,
              entry.quality,
              card.answers
            );
          }
        }
      }
      
      // Finish session in database
      const result = await sessionManager.finishSession();
      
      // Use database result if available, otherwise use local stats
      if (result && result.totalCards > 0) {
        setSessionStats({
          totalCards: result.totalCards,
          correctAnswers: result.correctAnswers,
          accuracy: result.accuracy,
          averageScore: result.accuracy
        });
        
        toast({
          title: "Session Complete!",
          description: `You scored ${Math.round(result.accuracy * 100)}% accuracy. Progress saved!`,
        });
      } else {
        // Fall back to local stats if database save failed
        console.warn('Database save returned no data, using local stats');
        setSessionStats(stats);
        
        toast({
          title: "Session Complete!",
          description: `You scored ${Math.round(stats.accuracy * 100)}% accuracy.`,
          variant: "default",
        });
      }
      
      setCurrentView('complete');
    } catch (error) {
      console.error('Error saving session:', error);
      
      // Still show completion with local stats
      setSessionStats(stats);
      setCurrentView('complete');
      
      toast({
        title: "Session Complete!",
        description: `You scored ${Math.round(stats.accuracy * 100)}% accuracy. (Progress may not be saved)`,
        variant: "destructive",
      });
    }
  };

  const handleRestartSession = () => {
    if (currentDeckId) {
      handleDeckSelected(currentDeckId, { dueOnly: true });
    }
  };

  const handleFinishSession = () => {
    setCurrentView('picker');
    setCurrentDeckId(null);
    setCurrentCards([]);
    setSessionStats(null);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'study':
        return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
            {currentView === 'picker' && (
          <div className="py-10">
            <DeckPicker onDeckSelected={handleDeckSelected} />
          </div>
            )}
            
            {currentView === 'session' && (
          <div className="py-10">
            <FlashcardSession 
              cards={currentCards}
              onSessionComplete={handleSessionComplete}
              onExit={() => {
                setCurrentView('picker');
                setCurrentDeckId(null);
                setCurrentCards([]);
                setSessionStats(null);
              }}
            />
          </div>
            )}
            
            {currentView === 'complete' && sessionStats && (
          <div className="py-10">
            <SessionComplete 
              stats={sessionStats}
              onRestart={handleRestartSession}
              onFinish={handleFinishSession}
            />
          </div>
            )}
          </div>
        );
      case 'dashboard':
        return <Dashboard />;
      case 'practice':
        return <Practice />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      {renderActiveTab()}
    </div>
  );
};

export default Index;

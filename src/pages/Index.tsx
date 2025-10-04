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
import type { Card as FlashCard } from '@/types/flashcard';
import type { SessionStats } from '@/types/flashcard';

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Show auth page if not logged in
  if (!user) {
    return <AuthPage />;
  }

  const handleDeckSelected = async (deckId: string) => {
    setCurrentDeckId(deckId);
    
    try {
      // Ensure session manager is initialized with current user
      await sessionManager.initialize();
      
      // Load cards for the deck
      const cards = await DatabaseService.getDueCards(deckId);
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

  const handleSessionComplete = async (stats: SessionStats) => {
    const result = await sessionManager.finishSession();
    
    if (result) {
      setSessionStats({
        ...stats,
        totalCards: result.totalCards,
        correctAnswers: result.correctAnswers,
        accuracy: result.accuracy,
        averageScore: result.accuracy // Use accuracy as average score for now
      });
    } else {
      setSessionStats(stats);
    }
    
    setCurrentView('complete');
    
    toast({
      title: "Session Complete!",
      description: `You scored ${Math.round((result?.accuracy || stats.accuracy) * 100)}% accuracy.`,
    });
  };

  const handleRestartSession = () => {
    if (currentDeckId) {
      handleDeckSelected(currentDeckId);
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
          <div className="min-h-screen bg-gradient-subtle">
            {currentView === 'picker' && (
              <DeckPicker onDeckSelected={handleDeckSelected} />
            )}
            
            {currentView === 'session' && (
              <FlashcardSession 
                cards={currentCards}
                onSessionComplete={handleSessionComplete}
              />
            )}
            
            {currentView === 'complete' && sessionStats && (
              <SessionComplete 
                stats={sessionStats}
                onRestart={handleRestartSession}
                onFinish={handleFinishSession}
              />
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

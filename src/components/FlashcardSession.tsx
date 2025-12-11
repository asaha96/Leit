import { useState, useEffect, useCallback } from 'react';
import { Card, SessionEntry, SessionStats } from '@/types/flashcard';
import { FlashcardView } from './FlashcardView';
import { SessionProgress } from './SessionProgress';
import { SessionComplete } from './SessionComplete';
import { Quality, calculateNextDue } from '@/utils/scheduler';
import { evaluateAnswer } from '@/utils/evaluator';
import { DatabaseService } from '@/services/database';
import { Button } from '@/components/ui/button';

interface FlashcardSessionProps {
  cards: Card[];
  onSessionComplete: (stats: SessionStats, sessions: SessionEntry[]) => void;
  onExit?: () => void;
}

export function FlashcardSession({ cards, onSessionComplete, onExit }: FlashcardSessionProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [sessionEntries, setSessionEntries] = useState<SessionEntry[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    totalCards: cards.length,
    correctAnswers: 0,
    accuracy: 0,
    averageScore: 0
  });

  const currentCard = cards[currentCardIndex];
  const isLastCard = currentCardIndex === cards.length - 1;

  const handleAnswer = useCallback((response: string, quality: Quality) => {
    if (!currentCard || isPaused) return;

    // Evaluate the answer
    const evaluation = evaluateAnswer(response, currentCard.answers);
    
    // Create session entry
    const sessionEntry: SessionEntry = {
      userId: 'local-user',
      cardId: currentCard.id,
      response: response.trim(),
      score: evaluation.score,
      quality,
      timestamp: Date.now(),
      nextDue: calculateNextDue(quality).toISOString()
    };

    // Update session entries
    const newEntries = [...sessionEntries, sessionEntry];
    setSessionEntries(newEntries);

    // Update stats
    const correctAnswers = evaluation.isCorrect 
      ? sessionStats.correctAnswers + 1 
      : sessionStats.correctAnswers;
    
    const totalScore = newEntries.reduce((sum, entry) => sum + entry.score, 0);
    const averageScore = totalScore / newEntries.length;
    
    const newStats: SessionStats = {
      totalCards: cards.length,
      correctAnswers,
      accuracy: correctAnswers / newEntries.length,
      averageScore
    };
    
    setSessionStats(newStats);

    // Move to next card or complete session
    if (isLastCard) {
      setIsComplete(true);
      onSessionComplete(newStats, newEntries);
    } else {
      setCurrentCardIndex(prev => prev + 1);
    }

    // Fire-and-forget schedule update
    DatabaseService.updateCardSchedule(currentCard.id, quality).catch((err) => {
      console.error('Failed to update card schedule', err);
    });
  }, [currentCard, sessionEntries, sessionStats, cards.length, isLastCard, onSessionComplete, isPaused]);

  const handleRestart = () => {
    setCurrentCardIndex(0);
    setSessionEntries([]);
    setIsComplete(false);
    setIsPaused(false);
    setSessionStats({
      totalCards: cards.length,
      correctAnswers: 0,
      accuracy: 0,
      averageScore: 0
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle if not in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case '1':
          event.preventDefault();
          // Trigger "Again" if answer has been revealed
          break;
        case '2':
          event.preventDefault();
          // Trigger "Hard" if answer has been revealed
          break;
        case '3':
          event.preventDefault();
          // Trigger "Good" if answer has been revealed
          break;
        case '4':
          event.preventDefault();
          // Trigger "Easy" if answer has been revealed
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (isComplete) {
    return (
      <SessionComplete
        stats={sessionStats}
        onRestart={handleRestart}
        onFinish={() => window.location.reload()}
      />
    );
  }

  if (!currentCard) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="text-muted-foreground">No cards available</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex-1">
          <SessionProgress
            currentCard={currentCardIndex + 1}
            totalCards={cards.length}
            accuracy={sessionStats.accuracy}
          />
        </div>
        <div className="flex items-center gap-2">
          {onExit && (
            <Button variant="ghost" onClick={onExit}>
              Exit
            </Button>
          )}
          <Button variant="outline" onClick={() => setIsPaused(!isPaused)}>
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
        </div>
      </div>

      {isPaused && (
        <div className="p-3 rounded-lg border border-border bg-muted text-sm text-muted-foreground">
          Session paused. Resume to continue answering.
        </div>
      )}
      
      <FlashcardView
        card={currentCard}
        onAnswer={handleAnswer}
        cardNumber={currentCardIndex + 1}
        totalCards={cards.length}
        disabled={isPaused}
      />
    </div>
  );
}
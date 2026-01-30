import { useState, useRef, useEffect } from 'react';
import { Card } from '@/types/flashcard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Quality, getQualityLabel } from '@/utils/scheduler';
import { evaluateAnswer } from '@/utils/evaluator';
import { Lightbulb, RotateCcw, Eye } from 'lucide-react';

interface FlashcardViewProps {
  card: Card;
  onAnswer: (response: string, quality: Quality) => void;
  cardNumber: number;
  totalCards: number;
  disabled?: boolean;
}

export function FlashcardView({ card, onAnswer, cardNumber, totalCards, disabled }: FlashcardViewProps) {
  const [userResponse, setUserResponse] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [evaluation, setEvaluation] = useState<{ score: number; feedback: string; isCorrect: boolean } | null>(null);
  const [showHint, setShowHint] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when card changes
  useEffect(() => {
    setUserResponse('');
    setIsRevealed(false);
    setEvaluation(null);
    setShowHint(false);
    
    // Focus input on new card
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [card.id]);

  const handleReveal = () => {
    if (disabled) return;
    if (!userResponse.trim()) {
      setEvaluation({
        score: 0,
        feedback: 'No answer provided',
        isCorrect: false
      });
    } else {
      const result = evaluateAnswer(userResponse, card.answers);
      setEvaluation(result);
    }
    setIsRevealed(true);
  };

  const handleQualitySelect = (quality: Quality) => {
    if (disabled) return;
    onAnswer(userResponse, quality);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (disabled) return;
    if (event.key === 'Enter' && !isRevealed) {
      handleReveal();
    } else if (isRevealed) {
      switch (event.key) {
        case '1':
          handleQualitySelect('again');
          break;
        case '2':
          handleQualitySelect('hard');
          break;
        case '3':
          handleQualitySelect('good');
          break;
        case '4':
          handleQualitySelect('easy');
          break;
      }
    }
  };

  const resetCard = () => {
    if (disabled) return;
    setUserResponse('');
    setIsRevealed(false);
    setEvaluation(null);
    setShowHint(false);
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Card */}
      <div className="bg-card text-card-foreground border border-border rounded-xl p-8 shadow-card transition-all duration-300 hover:shadow-lg hover:border-primary/20">
        <div className="text-center space-y-6">
          {/* Card header */}
          <div className="flex items-center justify-between text-sm text-muted-foreground animate-fade-in-down">
            <span className="font-medium">Card {cardNumber} of {totalCards}</span>
            {card.tags.length > 0 && (
              <div className="flex gap-1">
                {card.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Question */}
          <div className="space-y-4 animate-scale-in">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground leading-relaxed">
              {card.front}
            </h2>

            {/* Hint */}
            {card.hint && (
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHint(!showHint)}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <Lightbulb className={`w-4 h-4 mr-2 transition-colors ${showHint ? 'text-amber-500' : ''}`} />
                  {showHint ? 'Hide Hint' : 'Show Hint'}
                </Button>
                {showHint && (
                  <p className="text-sm text-muted-foreground italic bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800 animate-fade-in-up">
                    {card.hint}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Answer Input */}
          {!isRevealed && (
            <div className="space-y-4 max-w-md mx-auto animate-fade-in-up">
              <Input
                ref={inputRef}
                value={userResponse}
                onChange={(e) => setUserResponse(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your answer..."
                className="text-center text-lg py-3 transition-all focus:ring-2 focus:ring-primary/50"
                autoComplete="off"
                disabled={disabled}
              />
              <Button
                onClick={handleReveal}
                variant="reveal"
                size="lg"
                className="w-full animate-pulse-glow"
                disabled={disabled}
              >
                <Eye className="w-4 h-4 mr-2" />
                Reveal Answer (Enter)
              </Button>
            </div>
          )}

          {/* Revealed Content */}
          {isRevealed && (
            <div className="space-y-6 max-w-md mx-auto animate-scale-in">
              {/* User's answer and evaluation */}
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Your answer: <span className="font-medium text-foreground">"{userResponse || 'No answer'}"</span>
                </div>

                {evaluation && (
                  <div className={`p-4 rounded-lg transition-all ${
                    evaluation.isCorrect
                      ? 'feedback-correct border border-green-200 dark:border-green-800'
                      : 'feedback-incorrect border border-red-200 dark:border-red-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      {evaluation.isCorrect ? (
                        <span className="text-green-600 dark:text-green-400 text-lg">✓</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 text-lg">✗</span>
                      )}
                      <span className={evaluation.isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                        {evaluation.feedback}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Correct Answer */}
              <div className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl animate-fade-in-up">
                <div className="text-sm text-muted-foreground mb-2 uppercase tracking-wide">Correct Answer</div>
                <div className="text-xl md:text-2xl font-semibold text-foreground">
                  {card.back}
                </div>
              </div>

              {/* Quality Rating Buttons */}
              <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <p className="text-sm text-muted-foreground">
                  How well did you know this? <span className="text-xs">(Use keys 1-4)</span>
                </p>
                <div className="grid grid-cols-2 gap-3 stagger-children">
                  <Button
                    variant="again"
                    onClick={() => handleQualitySelect('again')}
                    className="flex-col h-auto py-4 hover:scale-105 transition-transform"
                  >
                    <span className="font-bold text-lg">1</span>
                    <span className="text-xs opacity-90">{getQualityLabel('again')}</span>
                  </Button>
                  <Button
                    variant="hard"
                    onClick={() => handleQualitySelect('hard')}
                    className="flex-col h-auto py-4 hover:scale-105 transition-transform"
                  >
                    <span className="font-bold text-lg">2</span>
                    <span className="text-xs opacity-90">{getQualityLabel('hard')}</span>
                  </Button>
                  <Button
                    variant="good"
                    onClick={() => handleQualitySelect('good')}
                    className="flex-col h-auto py-4 hover:scale-105 transition-transform"
                  >
                    <span className="font-bold text-lg">3</span>
                    <span className="text-xs opacity-90">{getQualityLabel('good')}</span>
                  </Button>
                  <Button
                    variant="easy"
                    onClick={() => handleQualitySelect('easy')}
                    className="flex-col h-auto py-4 hover:scale-105 transition-transform"
                  >
                    <span className="font-bold text-lg">4</span>
                    <span className="text-xs opacity-90">{getQualityLabel('easy')}</span>
                  </Button>
                </div>
              </div>

              {/* Reset button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={resetCard}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
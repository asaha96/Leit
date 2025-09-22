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
}

export function FlashcardView({ card, onAnswer, cardNumber, totalCards }: FlashcardViewProps) {
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
    onAnswer(userResponse, quality);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
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
    setUserResponse('');
    setIsRevealed(false);
    setEvaluation(null);
    setShowHint(false);
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-6">
      {/* Card */}
      <div className="bg-gradient-card border border-border rounded-xl p-8 shadow-card transition-smooth">
        <div className="text-center space-y-6">
          {/* Card header */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Card {cardNumber} of {totalCards}</span>
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
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground leading-relaxed">
              {card.front}
            </h2>
            
            {/* Hint */}
            {card.hint && (
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHint(!showHint)}
                  className="text-muted-foreground"
                >
                  <Lightbulb className="w-4 h-4 mr-2" />
                  {showHint ? 'Hide Hint' : 'Show Hint'}
                </Button>
                {showHint && (
                  <p className="text-sm text-muted-foreground italic bg-muted/50 p-3 rounded-lg">
                    {card.hint}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Answer Input */}
          {!isRevealed && (
            <div className="space-y-4 max-w-md mx-auto">
              <Input
                ref={inputRef}
                value={userResponse}
                onChange={(e) => setUserResponse(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your answer..."
                className="text-center text-lg py-3"
                autoComplete="off"
              />
              <Button 
                onClick={handleReveal}
                variant="reveal"
                size="lg"
                className="w-full"
              >
                <Eye className="w-4 h-4 mr-2" />
                Reveal Answer (Enter)
              </Button>
            </div>
          )}

          {/* Revealed Content */}
          {isRevealed && (
            <div className="space-y-6 max-w-md mx-auto">
              {/* User's answer and evaluation */}
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Your answer: <span className="font-medium text-foreground">"{userResponse || 'No answer'}"</span>
                </div>
                
                {evaluation && (
                  <div className={`p-3 rounded-lg ${
                    evaluation.isCorrect 
                      ? 'bg-success/10 text-success-foreground border border-success/20' 
                      : 'bg-destructive/10 text-destructive-foreground border border-destructive/20'
                  }`}>
                    {evaluation.feedback}
                  </div>
                )}
              </div>

              {/* Correct Answer */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="text-sm text-muted-foreground mb-2">Correct Answer:</div>
                <div className="text-xl font-semibold text-primary">
                  {card.back}
                </div>
              </div>

              {/* Quality Rating Buttons */}
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  How well did you know this? (Use keys 1-4)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="again"
                    onClick={() => handleQualitySelect('again')}
                    className="flex-col h-auto py-3"
                  >
                    <span className="font-semibold">1</span>
                    <span className="text-xs">{getQualityLabel('again')}</span>
                  </Button>
                  <Button
                    variant="hard"
                    onClick={() => handleQualitySelect('hard')}
                    className="flex-col h-auto py-3"
                  >
                    <span className="font-semibold">2</span>
                    <span className="text-xs">{getQualityLabel('hard')}</span>
                  </Button>
                  <Button
                    variant="good"
                    onClick={() => handleQualitySelect('good')}
                    className="flex-col h-auto py-3"
                  >
                    <span className="font-semibold">3</span>
                    <span className="text-xs">{getQualityLabel('good')}</span>
                  </Button>
                  <Button
                    variant="easy"
                    onClick={() => handleQualitySelect('easy')}
                    className="flex-col h-auto py-3"
                  >
                    <span className="font-semibold">4</span>
                    <span className="text-xs">{getQualityLabel('easy')}</span>
                  </Button>
                </div>
              </div>

              {/* Reset button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={resetCard}
                className="text-muted-foreground"
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
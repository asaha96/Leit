import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, EvaluationResult, AnswerMetadata } from '@/types/flashcard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Quality, getQualityLabel, getQualityColor } from '@/utils/scheduler';
import { evaluateAnswer, evaluateAnswerAsync } from '@/utils/evaluator';
import { inferDifficulty, formatConfidence, getConfidenceColor, InferenceResult } from '@/utils/difficultyInference';
import { Lightbulb, RotateCcw, Eye, Loader2, Sparkles } from 'lucide-react';

interface FlashcardViewProps {
  card: Card;
  onAnswer: (response: string, quality: Quality, metadata?: AnswerMetadata) => void;
  cardNumber: number;
  totalCards: number;
  disabled?: boolean;
  useAIEvaluation?: boolean;
}

export function FlashcardView({ card, onAnswer, cardNumber, totalCards, disabled, useAIEvaluation = false }: FlashcardViewProps) {
  const [userResponse, setUserResponse] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [inference, setInference] = useState<InferenceResult | null>(null);
  const [cardShownAt, setCardShownAt] = useState<number>(0);
  const [answerRevealedAt, setAnswerRevealedAt] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when card changes
  useEffect(() => {
    setUserResponse('');
    setIsRevealed(false);
    setIsEvaluating(false);
    setEvaluation(null);
    setShowHint(false);
    setHintUsed(false);
    setInference(null);
    setCardShownAt(Date.now());
    setAnswerRevealedAt(0);

    // Focus input on new card
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [card.id]);

  const handleShowHint = useCallback(() => {
    setShowHint(!showHint);
    if (!showHint) {
      setHintUsed(true); // Track that hint was used
    }
  }, [showHint]);

  const handleReveal = useCallback(async () => {
    if (disabled || isEvaluating) return;

    const revealTime = Date.now();
    setAnswerRevealedAt(revealTime);
    const responseTimeMs = revealTime - cardShownAt;

    if (!userResponse.trim()) {
      const emptyResult: EvaluationResult = {
        score: 0,
        feedback: 'No answer provided',
        isCorrect: false,
        matchType: 'none',
        aiUsed: false
      };
      setEvaluation(emptyResult);
      setIsRevealed(true);

      // Infer difficulty for empty answer
      const inferenceResult = inferDifficulty({
        responseTimeMs,
        answerScore: 0,
        hintUsed
      });
      setInference(inferenceResult);
      return;
    }

    // Use async evaluation if AI is enabled, otherwise sync
    if (useAIEvaluation) {
      setIsEvaluating(true);
      try {
        const result = await evaluateAnswerAsync(userResponse, card.answers, {
          useAI: true,
          cardContext: card.front
        });
        setEvaluation(result);

        // Infer difficulty
        const inferenceResult = inferDifficulty({
          responseTimeMs,
          answerScore: result.score,
          hintUsed
        });
        setInference(inferenceResult);
      } catch (error) {
        console.error('Evaluation failed:', error);
        // Fallback to sync evaluation
        const result = evaluateAnswer(userResponse, card.answers);
        setEvaluation(result);

        const inferenceResult = inferDifficulty({
          responseTimeMs,
          answerScore: result.score,
          hintUsed
        });
        setInference(inferenceResult);
      } finally {
        setIsEvaluating(false);
      }
    } else {
      const result = evaluateAnswer(userResponse, card.answers);
      setEvaluation(result);

      // Infer difficulty
      const inferenceResult = inferDifficulty({
        responseTimeMs,
        answerScore: result.score,
        hintUsed
      });
      setInference(inferenceResult);
    }

    setIsRevealed(true);
  }, [disabled, isEvaluating, userResponse, card.answers, card.front, cardShownAt, hintUsed, useAIEvaluation]);

  const handleQualitySelect = useCallback((quality: Quality) => {
    if (disabled) return;

    const responseTimeMs = answerRevealedAt - cardShownAt;
    const userOverrode = inference ? quality !== inference.quality : false;

    const metadata: AnswerMetadata = {
      responseTimeMs,
      hintUsed,
      inferredQuality: inference?.quality || quality,
      inferenceConfidence: inference?.confidence || 0,
      userOverrode
    };

    onAnswer(userResponse, quality, metadata);
  }, [disabled, answerRevealedAt, cardShownAt, hintUsed, inference, onAnswer, userResponse]);

  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (disabled) return;
    if (event.key === 'Enter' && !isRevealed && !isEvaluating) {
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
  }, [disabled, isRevealed, isEvaluating, handleReveal, handleQualitySelect]);

  const resetCard = useCallback(() => {
    if (disabled) return;
    setUserResponse('');
    setIsRevealed(false);
    setIsEvaluating(false);
    setEvaluation(null);
    setShowHint(false);
    // Note: We don't reset hintUsed - once used, it stays tracked
    setInference(null);
    setCardShownAt(Date.now()); // Reset timer
    inputRef.current?.focus();
  }, [disabled]);

  // Check if a quality button is the inferred choice
  const isInferredQuality = (quality: Quality): boolean => {
    return inference?.quality === quality;
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
                  onClick={handleShowHint}
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
                disabled={disabled || isEvaluating}
              />
              <Button
                onClick={handleReveal}
                variant="reveal"
                size="lg"
                className="w-full animate-pulse-glow"
                disabled={disabled || isEvaluating}
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Evaluating...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Reveal Answer (Enter)
                  </>
                )}
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
                    <div className="flex items-center justify-between gap-2">
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
                      {evaluation.aiUsed && (
                        <Badge variant="outline" className="text-xs">
                          <Sparkles className="w-3 h-3 mr-1" />
                          AI
                        </Badge>
                      )}
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

              {/* Inferred Quality Suggestion */}
              {inference && (
                <div className="p-4 bg-muted/50 border border-border rounded-lg animate-fade-in-up">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      Suggested: <span className="capitalize">{inference.quality}</span>
                    </span>
                    <Badge variant="secondary" className={`text-xs ${getConfidenceColor(inference.confidence)}`}>
                      {formatConfidence(inference.confidence)} confidence
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    "{inference.reasoning}"
                  </p>
                </div>
              )}

              {/* Quality Rating Buttons */}
              <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <p className="text-sm text-muted-foreground">
                  How well did you know this? <span className="text-xs">(Use keys 1-4)</span>
                </p>
                <div className="grid grid-cols-2 gap-3 stagger-children">
                  <Button
                    variant="again"
                    onClick={() => handleQualitySelect('again')}
                    className={`flex-col h-auto py-4 hover:scale-105 transition-transform ${
                      isInferredQuality('again') ? 'ring-2 ring-offset-2 ring-red-500' : ''
                    }`}
                  >
                    <span className="font-bold text-lg">1</span>
                    <span className="text-xs opacity-90">{getQualityLabel('again')}</span>
                    {isInferredQuality('again') && <span className="text-xs mt-1">✓ Suggested</span>}
                  </Button>
                  <Button
                    variant="hard"
                    onClick={() => handleQualitySelect('hard')}
                    className={`flex-col h-auto py-4 hover:scale-105 transition-transform ${
                      isInferredQuality('hard') ? 'ring-2 ring-offset-2 ring-orange-500' : ''
                    }`}
                  >
                    <span className="font-bold text-lg">2</span>
                    <span className="text-xs opacity-90">{getQualityLabel('hard')}</span>
                    {isInferredQuality('hard') && <span className="text-xs mt-1">✓ Suggested</span>}
                  </Button>
                  <Button
                    variant="good"
                    onClick={() => handleQualitySelect('good')}
                    className={`flex-col h-auto py-4 hover:scale-105 transition-transform ${
                      isInferredQuality('good') ? 'ring-2 ring-offset-2 ring-green-500' : ''
                    }`}
                  >
                    <span className="font-bold text-lg">3</span>
                    <span className="text-xs opacity-90">{getQualityLabel('good')}</span>
                    {isInferredQuality('good') && <span className="text-xs mt-1">✓ Suggested</span>}
                  </Button>
                  <Button
                    variant="easy"
                    onClick={() => handleQualitySelect('easy')}
                    className={`flex-col h-auto py-4 hover:scale-105 transition-transform ${
                      isInferredQuality('easy') ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                    }`}
                  >
                    <span className="font-bold text-lg">4</span>
                    <span className="text-xs opacity-90">{getQualityLabel('easy')}</span>
                    {isInferredQuality('easy') && <span className="text-xs mt-1">✓ Suggested</span>}
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

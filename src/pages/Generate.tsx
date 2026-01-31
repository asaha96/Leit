import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ContentInput } from '@/components/generate/ContentInput';
import { GeneratingProgress } from '@/components/generate/GeneratingProgress';
import { CardPreview } from '@/components/generate/CardPreview';
import { SaveDeck } from '@/components/generate/SaveDeck';
import { AIFlashcardService, setAIFlashcardTokenGetter } from '@/services/aiFlashcardService';
import { DatabaseService } from '@/services/database';
import type { GeneratedCard, GenerateOptions, GenerationResult } from '@/types/generate';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Step = 'input' | 'generating' | 'preview' | 'save';

interface GenerateProps {
  onDeckCreated?: () => void;
}

export function Generate({ onDeckCreated }: GenerateProps) {
  const { getToken } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('input');
  const [cards, setCards] = useState<GeneratedCard[]>([]);
  const [suggestedDeckName, setSuggestedDeckName] = useState('');
  const [contentSummary, setContentSummary] = useState('');
  const [generationStatus, setGenerationStatus] = useState('');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Set up auth token getter for the service
  useEffect(() => {
    if (getToken) {
      setAIFlashcardTokenGetter(getToken);
    }
  }, [getToken]);

  const handlePDFUpload = useCallback(async (file: File): Promise<string> => {
    const result = await AIFlashcardService.extractPDFText(file);
    if (!result) {
      throw new Error('Failed to extract text from PDF');
    }
    return result.text;
  }, []);

  const handleGenerate = useCallback(async (content: string, options: GenerateOptions) => {
    setIsGenerating(true);
    setError(null);
    setStep('generating');
    setGenerationStatus('Analyzing content...');
    setGenerationProgress(20);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      // Simulate progress updates (AI call doesn't provide real progress)
      const progressInterval = setInterval(() => {
        setGenerationProgress((prev) => Math.min(prev + 10, 90));
      }, 1000);

      setGenerationStatus('Generating flashcards...');
      setGenerationProgress(40);

      const result = await AIFlashcardService.generateFlashcards(content, options);

      clearInterval(progressInterval);
      setGenerationProgress(100);

      if (!result || result.cards.length === 0) {
        throw new Error('No flashcards were generated. Try providing more content.');
      }

      setCards(result.cards);
      setSuggestedDeckName(result.suggestedDeckName);
      setContentSummary(result.contentSummary);
      setStep('preview');

      toast({
        title: 'Cards Generated',
        description: `Successfully generated ${result.cards.length} flashcards.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate flashcards';
      setError(message);
      setStep('input');
      toast({
        title: 'Generation Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
      setAbortController(null);
    }
  }, [toast]);

  const handleCancel = useCallback(() => {
    if (abortController) {
      abortController.abort();
    }
    setIsGenerating(false);
    setStep('input');
    setGenerationProgress(0);
  }, [abortController]);

  const handleSave = useCallback(async (deckName: string, tags: string[]) => {
    setIsSaving(true);

    try {
      const selectedCards = cards.filter((c) => c.selected);

      if (selectedCards.length === 0) {
        throw new Error('No cards selected');
      }

      // Create the deck
      const deck = await DatabaseService.createDeck({
        title: deckName,
        tags,
        source: 'ai-generated',
      });

      if (!deck) {
        throw new Error('Failed to create deck');
      }

      // Create all cards in bulk
      const cardsToCreate = selectedCards.map((card) => ({
        deck_id: deck.id,
        front: card.front,
        back: card.back,
        hints: card.hints,
        answers: card.answers.length > 0 ? card.answers : [card.back],
        tags: card.tags,
        media_refs: null,
      }));

      const createdCards = await DatabaseService.createCards(cardsToCreate);

      if (createdCards.length === 0) {
        throw new Error('Failed to create cards');
      }

      toast({
        title: 'Deck Saved!',
        description: `Created "${deckName}" with ${createdCards.length} cards.`,
      });

      // Reset state
      setStep('input');
      setCards([]);
      setSuggestedDeckName('');
      setContentSummary('');

      // Notify parent
      onDeckCreated?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save deck';
      toast({
        title: 'Save Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [cards, toast, onDeckCreated]);

  const renderStep = () => {
    switch (step) {
      case 'input':
        return (
          <div className="space-y-6">
            {error && (
              <Card className="border-destructive bg-destructive/10 max-w-3xl mx-auto">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-destructive">Generation Error</p>
                      <p className="text-sm text-muted-foreground">{error}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setError(null)}
                      className="ml-auto"
                    >
                      Dismiss
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            <ContentInput
              onGenerate={handleGenerate}
              onPDFUpload={handlePDFUpload}
              isLoading={isGenerating}
            />
          </div>
        );

      case 'generating':
        return (
          <GeneratingProgress
            status={generationStatus}
            progress={generationProgress}
            onCancel={handleCancel}
          />
        );

      case 'preview':
        return (
          <CardPreview
            cards={cards}
            onCardsChange={setCards}
            onContinue={() => setStep('save')}
            onBack={() => setStep('input')}
          />
        );

      case 'save':
        return (
          <SaveDeck
            cards={cards}
            suggestedName={suggestedDeckName}
            contentSummary={contentSummary}
            onSave={handleSave}
            onBack={() => setStep('preview')}
            isSaving={isSaving}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <div className="container max-w-5xl mx-auto px-4 py-10">
        {renderStep()}
      </div>
    </div>
  );
}

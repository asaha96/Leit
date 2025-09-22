import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card as UICard, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Deck, Card as DatabaseCard } from '@/types/database';

interface PracticeQuestion {
  id: string;
  type: 'SA' | 'FIB' | 'MCQ';
  question: string;
  correctAnswer: string;
  choices?: string[];
  cardId: string;
}

export const Practice = () => {
  const { dbUser } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<string>('');
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedChoice, setSelectedChoice] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [results, setResults] = useState<{ correct: boolean; question: string; answer: string }[]>([]);
  const [generating, setGenerating] = useState(false);

  // Question generation settings
  const [numSA, setNumSA] = useState(2);
  const [numFIB, setNumFIB] = useState(2);
  const [numMCQ, setNumMCQ] = useState(2);

  useEffect(() => {
    fetchDecks();
  }, []);

  const fetchDecks = async () => {
    const { data } = await supabase
      .from('decks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setDecks(data);
  };

  const generateQuestions = async () => {
    if (!selectedDeck || !dbUser) return;

    setGenerating(true);
    
    try {
      // Get cards from selected deck
      const { data: cards } = await supabase
        .from('cards')
        .select('*')
        .eq('deck_id', selectedDeck);

      if (!cards || cards.length === 0) {
        alert('No cards found in selected deck');
        return;
      }

      const generatedQuestions: PracticeQuestion[] = [];
      const shuffledCards = [...cards].sort(() => Math.random() - 0.5);
      let cardIndex = 0;

      // Generate Short Answer questions
      for (let i = 0; i < numSA && cardIndex < shuffledCards.length; i++) {
        const card = shuffledCards[cardIndex++];
        generatedQuestions.push({
          id: `sa-${i}`,
          type: 'SA',
          question: card.front,
          correctAnswer: card.back,
          cardId: card.id
        });
      }

      // Generate Fill in the Blank questions
      for (let i = 0; i < numFIB && cardIndex < shuffledCards.length; i++) {
        const card = shuffledCards[cardIndex++];
        generatedQuestions.push({
          id: `fib-${i}`,
          type: 'FIB',
          question: `${card.front.replace('?', '')} is ___.`,
          correctAnswer: card.back,
          cardId: card.id
        });
      }

      // Generate Multiple Choice questions
      for (let i = 0; i < numMCQ && cardIndex < shuffledCards.length; i++) {
        const card = shuffledCards[cardIndex++];
        
        // Get distractor answers from other cards
        const otherCards = shuffledCards.filter(c => c.id !== card.id);
        const distractors = otherCards
          .slice(0, 3)
          .map(c => c.back);
        
        const choices = [card.back, ...distractors]
          .sort(() => Math.random() - 0.5);

        generatedQuestions.push({
          id: `mcq-${i}`,
          type: 'MCQ',
          question: card.front,
          correctAnswer: card.back,
          choices,
          cardId: card.id
        });
      }

      setQuestions(generatedQuestions);
      setCurrentIndex(0);
      setResults([]);

      // Create practice session
      const { data: session } = await supabase
        .from('sessions')
        .insert({
          user_id: dbUser.id,
          deck_id: selectedDeck,
          mode: 'practice'
        })
        .select()
        .single();

      if (session) {
        setSessionId(session.id);
      }

    } catch (error) {
      console.error('Error generating questions:', error);
    } finally {
      setGenerating(false);
    }
  };

  const submitAnswer = async () => {
    if (!sessionId) return;

    const currentQuestion = questions[currentIndex];
    const answer = currentQuestion.type === 'MCQ' ? selectedChoice : userAnswer;
    const isCorrect = answer.toLowerCase().trim() === currentQuestion.correctAnswer.toLowerCase().trim();

    // Record the event
    await supabase
      .from('session_events')
      .insert({
        session_id: sessionId,
        card_id: currentQuestion.cardId,
        response: answer,
        correct: isCorrect,
        ai_score: isCorrect ? 1 : 0
      });

    setResults([...results, {
      correct: isCorrect,
      question: currentQuestion.question,
      answer: answer
    }]);

    setShowResult(true);
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserAnswer('');
      setSelectedChoice('');
      setShowResult(false);
    } else {
      finishSession();
    }
  };

  const finishSession = async () => {
    if (!sessionId) return;

    const correctCount = results.filter(r => r.correct).length;
    const finalScore = results.length > 0 ? correctCount / results.length : 0;

    await supabase
      .from('sessions')
      .update({
        finished_at: new Date().toISOString(),
        score: finalScore
      })
      .eq('id', sessionId);

    // Reset state
    setQuestions([]);
    setCurrentIndex(0);
    setSessionId(null);
    setShowResult(false);
  };

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  if (questions.length === 0) {
    return (
      <div className="space-y-6 p-6 max-w-2xl mx-auto">
        <UICard>
          <CardHeader>
            <CardTitle>Practice Question Generator</CardTitle>
            <CardDescription>
              Generate practice questions from your flashcard decks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Select Deck</Label>
              <Select value={selectedDeck} onValueChange={setSelectedDeck}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a deck" />
                </SelectTrigger>
                <SelectContent>
                  {decks.map(deck => (
                    <SelectItem key={deck.id} value={deck.id}>
                      {deck.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Short Answer</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={numSA}
                  onChange={(e) => setNumSA(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Fill in Blank</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={numFIB}
                  onChange={(e) => setNumFIB(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Multiple Choice</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={numMCQ}
                  onChange={(e) => setNumMCQ(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <Button 
              onClick={generateQuestions}
              disabled={!selectedDeck || generating || (numSA + numFIB + numMCQ === 0)}
              className="w-full"
            >
              {generating ? 'Generating...' : 'Generate Practice Questions'}
            </Button>
          </CardContent>
        </UICard>

        {results.length > 0 && (
          <UICard>
            <CardHeader>
              <CardTitle>Session Complete!</CardTitle>
              <CardDescription>
                Score: {results.filter(r => r.correct).length} / {results.length} ({Math.round((results.filter(r => r.correct).length / results.length) * 100)}%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 rounded bg-accent/20">
                    {result.correct ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm">{result.question}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </UICard>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Practice Session</h2>
        <Badge variant="outline">
          {currentIndex + 1} of {questions.length}
        </Badge>
      </div>

      <UICard>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Badge>{currentQuestion.type}</Badge>
            <CardTitle className="text-lg">{currentQuestion.question}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showResult && (
            <>
              {currentQuestion.type === 'MCQ' ? (
                <div className="space-y-2">
                  {currentQuestion.choices?.map((choice, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedChoice(choice)}
                      className={`w-full text-left p-3 rounded border ${
                        selectedChoice === choice ? 'border-primary bg-primary/10' : 'border-border'
                      }`}
                    >
                      {String.fromCharCode(97 + index)}) {choice}
                    </button>
                  ))}
                </div>
              ) : (
                <Input
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Type your answer..."
                  onKeyDown={(e) => e.key === 'Enter' && submitAnswer()}
                />
              )}

              <Button 
                onClick={submitAnswer}
                disabled={currentQuestion.type === 'MCQ' ? !selectedChoice : !userAnswer.trim()}
                className="w-full"
              >
                Submit Answer
              </Button>
            </>
          )}

          {showResult && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${
                results[results.length - 1]?.correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center space-x-2">
                  {results[results.length - 1]?.correct ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">
                    {results[results.length - 1]?.correct ? 'Correct!' : 'Incorrect'}
                  </span>
                </div>
                <p className="mt-2 text-sm">
                  <strong>Correct answer:</strong> {currentQuestion.correctAnswer}
                </p>
              </div>

              <Button onClick={nextQuestion} className="w-full">
                {isLastQuestion ? 'Finish Session' : (
                  <>
                    Next Question <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </UICard>
    </div>
  );
};
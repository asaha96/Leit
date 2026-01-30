import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DatabaseService } from '@/services/database';
import { DeckImporter } from '@/services/deckImporter';
import { Plus, Upload, Play, BookOpen } from 'lucide-react';
import type { Deck } from '@/types/database';

interface DeckPickerProps {
  onDeckSelected: (deckId: string, options?: { dueOnly?: boolean }) => void;
}

export function DeckPicker({ onDeckSelected }: DeckPickerProps) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [dueOnly, setDueOnly] = useState(true);

  useEffect(() => {
    loadDecks();
  }, []);

  const loadDecks = async () => {
    setLoading(true);
    try {
      // Timeout so we don't hang forever if API/token is slow (e.g. cold start, Clerk)
      const deckList = await Promise.race([
        DatabaseService.getDecks(),
        new Promise<Deck[]>((resolve) => setTimeout(() => resolve([]), 12000)),
      ]);
      setDecks(deckList);
    } catch (e) {
      console.error("Load decks error:", e);
      setDecks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCSVImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setImporting(true);
      try {
        const text = await file.text();
        const csvData = DeckImporter.parseCSVText(text);
        
        if (csvData.length === 0) {
          alert('No valid cards found in CSV file');
          return;
        }

        const title = file.name.replace('.csv', '');
        const result = await DeckImporter.importFromCSV(title, csvData);
        
        if (result.deck) {
          await loadDecks();
          onDeckSelected(result.deck.id);
        } else {
          alert('Failed to import deck');
        }
      } catch (error) {
        console.error('CSV import error:', error);
        alert('Failed to import CSV file');
      } finally {
        setImporting(false);
      }
    };

    input.click();
  };

  const handleQuickDemo = async () => {
    setImporting(true);
    try {
      const demoCSV = [
        { front: 'What is the capital of France?', back: 'Paris', answers: 'Paris|Paris, France', hint: 'Starts with P' },
        { front: 'What is 2 + 2?', back: '4', answers: '4|four', hint: 'Basic arithmetic' },
        { front: 'What is the largest planet?', back: 'Jupiter', answers: 'Jupiter', hint: 'Gas giant' },
        { front: 'Who wrote Romeo and Juliet?', back: 'William Shakespeare', answers: 'Shakespeare|William Shakespeare', hint: 'English playwright' },
        { front: 'What is the chemical symbol for gold?', back: 'Au', answers: 'Au|Gold', hint: 'From Latin aurum' }
      ];

      const result = await DeckImporter.importFromCSV('Demo Deck', demoCSV, 'quick-demo');
      
      if (result.deck) {
        await loadDecks();
        onDeckSelected(result.deck.id, { dueOnly });
        onDeckSelected(result.deck.id, { dueOnly });
      } else {
        alert('Failed to create demo deck');
      }
    } catch (error) {
      console.error('Demo deck creation error:', error);
      alert('Failed to create demo deck');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-5xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-2">
          <Skeleton className="h-4 w-16 mx-auto" />
          <Skeleton className="h-10 w-64 mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
        <Card className="bg-card">
          <CardContent className="py-6">
            <div className="flex gap-4 flex-wrap items-center justify-center">
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-5 w-24" />
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-3 animate-fade-in-down">
        <p className="text-sm uppercase tracking-widest text-muted-foreground font-medium">Study</p>
        <h1 className="text-4xl md:text-5xl font-bold text-primary">Leit Flashcards</h1>
        <p className="text-muted-foreground">Choose a deck to start your learning session</p>
      </div>

      <Card className="bg-card text-card-foreground border-border shadow-card">
        <CardContent className="py-6">
          <div className="flex gap-4 flex-wrap items-center justify-center">
            <Button
              onClick={handleQuickDemo}
              disabled={importing}
              className="tap-target"
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {importing ? 'Creating...' : 'Quick Demo'}
            </Button>
            <Button
              onClick={handleCSVImport}
              disabled={importing}
              variant="outline"
              className="tap-target"
            >
              <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
              {importing ? 'Importing...' : 'Import CSV'}
            </Button>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer tap-target px-3">
              <input
                type="checkbox"
                checked={dueOnly}
                onChange={(e) => setDueOnly(e.target.checked)}
                className="h-4 w-4 rounded border-border"
                aria-describedby="due-only-desc"
              />
              <span>Due only</span>
              <span id="due-only-desc" className="sr-only">
                Only show cards that are due for review
              </span>
            </label>
          </div>
        </CardContent>
      </Card>

      {decks.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 stagger-children" role="list" aria-label="Available decks">
          {decks.map((deck, index) => (
            <Card
              key={deck.id}
              className="cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 border-border bg-card text-card-foreground hover:border-primary/30 focus-within:ring-2 focus-within:ring-ring group"
              onClick={() => onDeckSelected(deck.id, { dueOnly })}
              role="listitem"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <button
                className="w-full text-left focus:outline-none"
                aria-label={`Study ${deck.title} deck`}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <CardTitle className="text-primary group-hover:text-primary/80 transition-colors">{deck.title}</CardTitle>
                  <Play className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all" aria-hidden="true" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {deck.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {deck.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-accent text-accent-foreground text-xs rounded-full transition-colors group-hover:bg-primary/10"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Source: {deck.source || 'Manual'}
                    </p>
                  </div>
                </CardContent>
              </button>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-card text-card-foreground">
          <CardContent className="empty-state">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
            <h3 className="text-lg font-semibold mb-2">No decks yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Create your first flashcard deck to start learning. You can create a quick demo or import your own cards from a CSV file.
            </p>
            <div className="flex gap-3 flex-wrap justify-center">
              <Button onClick={handleQuickDemo} disabled={importing}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Create Demo Deck
              </Button>
              <Button variant="outline" onClick={handleCSVImport} disabled={importing}>
                <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                Import CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
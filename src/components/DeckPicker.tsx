import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatabaseService } from '@/services/database';
import { DeckImporter } from '@/services/deckImporter';
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
    const deckList = await DatabaseService.getDecks();
    setDecks(deckList);
    setLoading(false);
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
      <div className="container max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">Loading Decks...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Study</p>
        <h1 className="text-4xl font-bold text-primary">Leit Flashcards</h1>
        <p className="text-muted-foreground text-sm">Choose a deck to start your session</p>
      </div>

      <Card className="bg-card text-card-foreground border-border shadow-card">
        <CardContent className="py-6">
          <div className="flex gap-4 flex-wrap items-center justify-center">
            <Button 
              onClick={handleQuickDemo}
              disabled={importing}
              className="bg-gradient-primary text-white"
            >
              {importing ? 'Creating...' : 'Quick Demo'}
            </Button>
            <Button 
              onClick={handleCSVImport}
              disabled={importing}
              variant="outline"
            >
              {importing ? 'Importing...' : 'Import CSV'}
            </Button>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={dueOnly}
                onChange={(e) => setDueOnly(e.target.checked)}
                className="h-4 w-4"
              />
              Due only
            </label>
          </div>
        </CardContent>
      </Card>

      {decks.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <Card 
              key={deck.id} 
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01] border-border bg-card text-card-foreground hover:bg-card/90"
              onClick={() => onDeckSelected(deck.id, { dueOnly })}
            >
              <CardHeader>
                <CardTitle className="text-primary">{deck.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {deck.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {deck.tags.map((tag) => (
                        <span 
                          key={tag}
                          className="px-2 py-1 bg-accent text-accent-foreground text-xs rounded-full"
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
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center p-8 bg-card text-card-foreground">
          <CardContent>
            <p className="text-muted-foreground mb-4">No decks available</p>
            <p className="text-sm text-muted-foreground">
              Create a demo deck or import a CSV file to get started
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
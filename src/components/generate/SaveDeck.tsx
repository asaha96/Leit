import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Save, X, Plus } from 'lucide-react';
import type { GeneratedCard } from '@/types/generate';

interface SaveDeckProps {
  cards: GeneratedCard[];
  suggestedName: string;
  contentSummary: string;
  onSave: (deckName: string, tags: string[]) => void;
  onBack: () => void;
  isSaving?: boolean;
}

export function SaveDeck({
  cards,
  suggestedName,
  contentSummary,
  onSave,
  onBack,
  isSaving,
}: SaveDeckProps) {
  const [deckName, setDeckName] = useState(suggestedName);
  const [tags, setTags] = useState<string[]>(() => {
    // Collect unique tags from all selected cards
    const allTags = cards
      .filter((c) => c.selected)
      .flatMap((c) => c.tags);
    return [...new Set(allTags)].slice(0, 5); // Max 5 initial tags
  });
  const [newTag, setNewTag] = useState('');

  const selectedCards = cards.filter((c) => c.selected);

  const addTag = () => {
    const trimmed = newTag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const handleSave = () => {
    if (deckName.trim()) {
      onSave(deckName.trim(), tags);
    }
  };

  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Save className="h-5 w-5" />
          Save Your Deck
        </CardTitle>
        <CardDescription>
          {contentSummary || `${selectedCards.length} cards ready to save`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="deck-name">Deck Name</Label>
          <Input
            id="deck-name"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="Enter a name for your deck"
            disabled={isSaving}
          />
        </div>

        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-destructive"
                  disabled={isSaving}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a tag"
              className="flex-1"
              disabled={isSaving}
            />
            <Button
              type="button"
              variant="outline"
              onClick={addTag}
              disabled={!newTag.trim() || isSaving}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium">Summary</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>{selectedCards.length} flashcards will be created</li>
            <li>{tags.length} tags assigned</li>
          </ul>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1"
            disabled={isSaving}
          >
            Back
          </Button>
          <Button
            onClick={handleSave}
            disabled={!deckName.trim() || selectedCards.length === 0 || isSaving}
            className="flex-1"
          >
            {isSaving ? (
              'Saving...'
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Deck
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

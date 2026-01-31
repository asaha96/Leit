import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Plus, ChevronDown, ChevronUp, Edit2, Check, X } from 'lucide-react';
import type { GeneratedCard } from '@/types/generate';

interface CardPreviewProps {
  cards: GeneratedCard[];
  onCardsChange: (cards: GeneratedCard[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function CardPreview({ cards, onCardsChange, onContinue, onBack }: CardPreviewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const selectedCount = cards.filter((c) => c.selected).length;
  const totalCount = cards.length;

  const toggleCard = (id: string) => {
    onCardsChange(
      cards.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  const toggleSelectAll = () => {
    const allSelected = cards.every((c) => c.selected);
    onCardsChange(cards.map((c) => ({ ...c, selected: !allSelected })));
  };

  const deleteCard = (id: string) => {
    onCardsChange(cards.filter((c) => c.id !== id));
  };

  const updateCard = (id: string, updates: Partial<GeneratedCard>) => {
    onCardsChange(
      cards.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const addNewCard = () => {
    const newCard: GeneratedCard = {
      id: `new-${Date.now()}`,
      front: '',
      back: '',
      hints: [],
      answers: [],
      tags: [],
      selected: true,
    };
    onCardsChange([...cards, newCard]);
    setExpandedId(newCard.id);
    setEditingId(newCard.id);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Preview Generated Cards</CardTitle>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
              {cards.every((c) => c.selected) ? 'Deselect All' : 'Select All'}
            </Button>
            <Badge variant="secondary">
              {selectedCount} of {totalCount} selected
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {cards.map((card, index) => (
              <CardItem
                key={card.id}
                card={card}
                index={index}
                isExpanded={expandedId === card.id}
                isEditing={editingId === card.id}
                onToggle={() => toggleCard(card.id)}
                onExpand={() => setExpandedId(expandedId === card.id ? null : card.id)}
                onEdit={() => setEditingId(card.id)}
                onSaveEdit={() => setEditingId(null)}
                onCancelEdit={() => setEditingId(null)}
                onDelete={() => deleteCard(card.id)}
                onUpdate={(updates) => updateCard(card.id, updates)}
              />
            ))}
          </div>
        </ScrollArea>

        <Button
          variant="outline"
          onClick={addNewCard}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Card
        </Button>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
          <Button
            onClick={onContinue}
            disabled={selectedCount === 0}
            className="flex-1"
          >
            Continue with {selectedCount} cards
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface CardItemProps {
  card: GeneratedCard;
  index: number;
  isExpanded: boolean;
  isEditing: boolean;
  onToggle: () => void;
  onExpand: () => void;
  onEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<GeneratedCard>) => void;
}

function CardItem({
  card,
  index,
  isExpanded,
  isEditing,
  onToggle,
  onExpand,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onUpdate,
}: CardItemProps) {
  const [editFront, setEditFront] = useState(card.front);
  const [editBack, setEditBack] = useState(card.back);
  const [editHints, setEditHints] = useState(card.hints.join('\n'));

  const handleSave = () => {
    onUpdate({
      front: editFront,
      back: editBack,
      hints: editHints.split('\n').filter((h) => h.trim()),
      answers: [editBack, ...editBack.split(',').map((a) => a.trim()).filter(Boolean)],
    });
    onSaveEdit();
  };

  const handleCancel = () => {
    setEditFront(card.front);
    setEditBack(card.back);
    setEditHints(card.hints.join('\n'));
    onCancelEdit();
  };

  return (
    <div
      className={`border rounded-lg transition-colors ${
        card.selected ? 'border-primary/50 bg-primary/5' : 'border-border'
      }`}
    >
      <div className="flex items-start gap-3 p-3">
        <Checkbox
          checked={card.selected}
          onCheckedChange={onToggle}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <div
            className="flex items-start justify-between gap-2 cursor-pointer"
            onClick={onExpand}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground">
                Card {index + 1}
              </p>
              <p className="text-sm truncate">{card.front || 'Empty question'}</p>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 pt-0 space-y-3 border-t mt-2">
          {isEditing ? (
            <>
              <div className="space-y-2 pt-3">
                <Label className="text-xs">Question (Front)</Label>
                <Textarea
                  value={editFront}
                  onChange={(e) => setEditFront(e.target.value)}
                  className="min-h-[60px] text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Answer (Back)</Label>
                <Textarea
                  value={editBack}
                  onChange={(e) => setEditBack(e.target.value)}
                  className="min-h-[60px] text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Hints (one per line)</Label>
                <Textarea
                  value={editHints}
                  onChange={(e) => setEditHints(e.target.value)}
                  placeholder="Enter hints, one per line"
                  className="min-h-[40px] text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave}>
                  <Check className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Question
                </p>
                <p className="text-sm">{card.front}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Answer
                </p>
                <p className="text-sm">{card.back}</p>
              </div>
              {card.hints.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Hints
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    {card.hints.map((hint, i) => (
                      <li key={i}>{hint}</li>
                    ))}
                  </ul>
                </div>
              )}
              {card.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {card.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={onEdit}>
                  <Edit2 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={onDelete}>
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

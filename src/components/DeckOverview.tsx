import { useState } from 'react';
import { Deck, SessionStats, SessionEntry } from '@/types/flashcard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card as UICard } from '@/components/ui/card';
import { FlashcardSession } from './FlashcardSession';
import { saveSessionEntries, saveSessionStats, getDueCount, exportSessionData } from '@/utils/sessionStorage';
import { BookOpen, Play, Download, BarChart3, Clock } from 'lucide-react';

interface DeckOverviewProps {
  deck: Deck;
}

export function DeckOverview({ deck }: DeckOverviewProps) {
  const [isStudying, setIsStudying] = useState(false);
  const dueCount = getDueCount();

  const handleStartSession = () => {
    setIsStudying(true);
  };

  const handleSessionComplete = (stats: SessionStats, sessions: SessionEntry[]) => {
    // Save session data
    saveSessionEntries(sessions);
    saveSessionStats(stats);
    
    // Return to overview
    setIsStudying(false);
  };

  if (isStudying) {
    return (
      <FlashcardSession
        cards={deck.cards}
        onSessionComplete={handleSessionComplete}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {deck.title}
          </h1>
          <p className="text-muted-foreground">
            Master your knowledge with AI-enhanced spaced repetition
          </p>
        </div>
        
        {/* Deck tags */}
        {deck.tags.length > 0 && (
          <div className="flex justify-center gap-2 flex-wrap">
            {deck.tags.map(tag => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Cards */}
        <UICard className="bg-gradient-card border-border shadow-card p-6">
          <div className="flex items-center space-x-4">
            <div className="bg-primary/10 p-3 rounded-lg">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Cards</p>
              <p className="text-2xl font-bold text-foreground">{deck.cards.length}</p>
            </div>
          </div>
        </UICard>

        {/* Due Cards */}
        <UICard className="bg-gradient-card border-border shadow-card p-6">
          <div className="flex items-center space-x-4">
            <div className="bg-success/10 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Due Now</p>
              <p className="text-2xl font-bold text-success">{dueCount}</p>
            </div>
          </div>
        </UICard>

        {/* Progress */}
        <UICard className="bg-gradient-card border-border shadow-card p-6">
          <div className="flex items-center space-x-4">
            <div className="bg-warning/10 p-3 rounded-lg">
              <BarChart3 className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Studied</p>
              <p className="text-2xl font-bold text-foreground">
                {Math.round((dueCount / deck.cards.length) * 100)}%
              </p>
            </div>
          </div>
        </UICard>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          onClick={handleStartSession}
          size="lg"
          className="px-8 py-4 text-lg shadow-glow"
          variant="default"
        >
          <Play className="w-5 h-5 mr-3" />
          Start Study Session
        </Button>
        
        <Button
          onClick={exportSessionData}
          variant="outline"
          size="lg"
          className="px-6"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Feature Highlights */}
      <div className="bg-muted/20 border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Study Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
            <div>
              <p className="font-medium text-foreground">Keyboard Shortcuts</p>
              <p>Enter to reveal, 1-4 for quality rating</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
            <div>
              <p className="font-medium text-foreground">Smart Scheduling</p>
              <p>Spaced repetition based on your performance</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
            <div>
              <p className="font-medium text-foreground">Answer Evaluation</p>
              <p>AI-powered feedback on your responses</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
            <div>
              <p className="font-medium text-foreground">Progress Tracking</p>
              <p>Detailed statistics and learning analytics</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
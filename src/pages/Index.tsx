import { DeckOverview } from '@/components/DeckOverview';
import { sampleDeck } from '@/data/sampleDeck';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg"></div>
              <h1 className="text-xl font-bold text-foreground">Leat</h1>
            </div>
            <p className="text-sm text-muted-foreground hidden sm:block">
              AI-Enhanced Flashcard Learning
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <DeckOverview deck={sampleDeck} />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/20 mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>Leat MVP - Built with React, TypeScript, and Tailwind CSS</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

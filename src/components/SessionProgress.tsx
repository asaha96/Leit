import { CheckCircle2, Circle } from 'lucide-react';

interface SessionProgressProps {
  currentCard: number;
  totalCards: number;
  accuracy: number;
}

export function SessionProgress({ currentCard, totalCards, accuracy }: SessionProgressProps) {
  const progressPercentage = (currentCard / totalCards) * 100;
  const completedCards = currentCard - 1;

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="relative">
        <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
          <div
            className="h-2.5 bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-700 ease-out relative"
            style={{ width: `${progressPercentage}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </div>
        </div>
        {/* Progress dots */}
        <div className="flex justify-between absolute -top-1 left-0 right-0">
          {Array.from({ length: Math.min(totalCards, 10) }).map((_, i) => {
            const cardNum = Math.ceil((i + 1) * (totalCards / Math.min(totalCards, 10)));
            const isCompleted = cardNum <= completedCards;
            const isCurrent = cardNum === currentCard;
            return (
              <div
                key={i}
                className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? 'bg-primary text-primary-foreground scale-100'
                    : isCurrent
                    ? 'bg-primary/20 border-2 border-primary scale-110'
                    : 'bg-muted-foreground/20 scale-75'
                }`}
              >
                {isCompleted && <CheckCircle2 className="w-3 h-3" />}
                {isCurrent && <Circle className="w-2 h-2 fill-primary" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-between items-center text-sm pt-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Progress:</span>
          <span className="font-semibold text-foreground bg-muted px-2 py-0.5 rounded">
            {currentCard} / {totalCards}
          </span>
        </div>

        {completedCards > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Accuracy:</span>
            <span className={`font-bold px-2 py-0.5 rounded transition-colors ${
              accuracy >= 0.8
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : accuracy >= 0.6
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {Math.round(accuracy * 100)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
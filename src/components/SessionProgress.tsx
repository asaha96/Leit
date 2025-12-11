interface SessionProgressProps {
  currentCard: number;
  totalCards: number;
  accuracy: number;
}

export function SessionProgress({ currentCard, totalCards, accuracy }: SessionProgressProps) {
  const progressPercentage = (currentCard / totalCards) * 100;

  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      <div className="w-full bg-progress-bg rounded-full h-3 shadow-inner">
        <div 
          className="h-3 bg-gradient-primary rounded-full transition-all duration-500 ease-out shadow-glow"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      
      {/* Stats */}
      <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground">
          Card <span className="font-semibold text-foreground">{currentCard}</span> of{' '}
          <span className="font-semibold text-foreground">{totalCards}</span>
        </span>
        
        {currentCard > 1 && (
          <span className="text-muted-foreground">
            Accuracy:{' '}
            <span className={`font-semibold ${
              accuracy >= 0.8 
                ? 'text-success' 
                : accuracy >= 0.6 
                ? 'text-warning' 
                : 'text-destructive'
            }`}>
              {Math.round(accuracy * 100)}%
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
import { SessionStats } from '@/types/flashcard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, RotateCcw, Download } from 'lucide-react';

interface SessionCompleteProps {
  stats: SessionStats;
  onRestart: () => void;
  onFinish: () => void;
}

export function SessionComplete({ stats, onRestart, onFinish }: SessionCompleteProps) {
  const accuracyPercentage = Math.round(stats.accuracy * 100);
  const averageScorePercentage = Math.round(stats.averageScore * 100);

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 0.8) return 'text-success';
    if (accuracy >= 0.6) return 'text-warning';
    return 'text-destructive';
  };

  const getPerformanceMessage = (accuracy: number) => {
    if (accuracy >= 0.9) return 'Outstanding! 🌟';
    if (accuracy >= 0.8) return 'Great work! 🎉';
    if (accuracy >= 0.7) return 'Good job! 👍';
    if (accuracy >= 0.6) return 'Keep practicing! 📚';
    return 'More practice needed 💪';
  };

  return (
    <div className="max-w-2xl mx-auto text-center space-y-8">
      {/* Completion Icon */}
      <div className="flex justify-center">
        <div className="bg-gradient-success p-4 rounded-full shadow-glow">
          <CheckCircle className="w-12 h-12 text-success-foreground" />
        </div>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          Session Complete!
        </h1>
        <p className="text-lg text-muted-foreground">
          {getPerformanceMessage(stats.accuracy)}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Accuracy */}
        <div className="bg-gradient-card border border-border rounded-xl p-6 shadow-card">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Accuracy</p>
            <p className={`text-3xl font-bold ${getAccuracyColor(stats.accuracy)}`}>
              {accuracyPercentage}%
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.correctAnswers} of {stats.totalCards} correct
            </p>
          </div>
        </div>

        {/* Average Score */}
        <div className="bg-gradient-card border border-border rounded-xl p-6 shadow-card">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Avg Score</p>
            <p className="text-3xl font-bold text-primary">
              {averageScorePercentage}%
            </p>
            <p className="text-xs text-muted-foreground">
              Overall performance
            </p>
          </div>
        </div>

        {/* Cards Studied */}
        <div className="bg-gradient-card border border-border rounded-xl p-6 shadow-card">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Cards Studied</p>
            <p className="text-3xl font-bold text-foreground">
              {stats.totalCards}
            </p>
            <p className="text-xs text-muted-foreground">
              Complete session
            </p>
          </div>
        </div>
      </div>

      {/* Performance Badge */}
      <div className="flex justify-center">
        <Badge 
          variant={stats.accuracy >= 0.8 ? 'default' : 'secondary'}
          className="text-base px-6 py-2"
        >
          {stats.accuracy >= 0.9 && '🌟 Master'}
          {stats.accuracy >= 0.8 && stats.accuracy < 0.9 && '🎯 Excellent'}
          {stats.accuracy >= 0.7 && stats.accuracy < 0.8 && '👍 Good'}
          {stats.accuracy >= 0.6 && stats.accuracy < 0.7 && '📚 Learning'}
          {stats.accuracy < 0.6 && '💪 Keep Going'}
        </Badge>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          onClick={onRestart}
          variant="default"
          size="lg"
          className="px-8"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Study Again
        </Button>
        
        <Button
          onClick={onFinish}
          variant="outline"
          size="lg"
          className="px-8"
        >
          Finish Session
        </Button>
      </div>

      {/* Tips */}
      <div className="bg-muted/30 border border-border rounded-lg p-4 text-left">
        <h3 className="font-semibold text-foreground mb-2">Study Tips:</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Cards you marked as "Again" will appear sooner</li>
          <li>• "Easy" cards won't be shown for 3 days</li>
          <li>• Regular practice improves long-term retention</li>
          <li>• Focus on understanding, not just memorization</li>
        </ul>
      </div>
    </div>
  );
}
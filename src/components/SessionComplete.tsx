import { SessionStats } from '@/types/flashcard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, RotateCcw, Trophy, Target, Zap } from 'lucide-react';

interface SessionCompleteProps {
  stats: SessionStats;
  onRestart: () => void;
  onFinish: () => void;
}

export function SessionComplete({ stats, onRestart, onFinish }: SessionCompleteProps) {
  const accuracyPercentage = Math.round(stats.accuracy * 100);
  const averageScorePercentage = Math.round(stats.averageScore * 100);

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 0.8) return 'text-green-600 dark:text-green-400';
    if (accuracy >= 0.6) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getAccuracyBg = (accuracy: number) => {
    if (accuracy >= 0.8) return 'from-green-500/20 to-green-500/5';
    if (accuracy >= 0.6) return 'from-amber-500/20 to-amber-500/5';
    return 'from-red-500/20 to-red-500/5';
  };

  const getPerformanceMessage = (accuracy: number) => {
    if (accuracy >= 0.9) return 'Outstanding performance!';
    if (accuracy >= 0.8) return 'Great work today!';
    if (accuracy >= 0.7) return 'Good progress!';
    if (accuracy >= 0.6) return 'Keep it up!';
    return 'Every session counts!';
  };

  return (
    <div className="max-w-2xl mx-auto text-center space-y-8 animate-fade-in">
      {/* Completion Icon */}
      <div className="flex justify-center animate-scale-in">
        <div className={`relative p-6 rounded-full bg-gradient-to-br ${getAccuracyBg(stats.accuracy)} border-2 ${stats.accuracy >= 0.8 ? 'border-green-500/30' : stats.accuracy >= 0.6 ? 'border-amber-500/30' : 'border-red-500/30'}`}>
          {stats.accuracy >= 0.8 ? (
            <Trophy className="w-16 h-16 text-green-500 animate-bounce-subtle" />
          ) : stats.accuracy >= 0.6 ? (
            <Target className="w-16 h-16 text-amber-500" />
          ) : (
            <Zap className="w-16 h-16 text-red-500" />
          )}
          <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-2 animate-scale-in" style={{ animationDelay: '300ms' }}>
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          Session Complete!
        </h1>
        <p className="text-lg text-muted-foreground">
          {getPerformanceMessage(stats.accuracy)}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children">
        {/* Accuracy */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Accuracy</p>
            <p className={`text-4xl font-bold ${getAccuracyColor(stats.accuracy)}`}>
              {accuracyPercentage}%
            </p>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full transition-all duration-1000 ${stats.accuracy >= 0.8 ? 'bg-green-500' : stats.accuracy >= 0.6 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${accuracyPercentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.correctAnswers} of {stats.totalCards} correct
            </p>
          </div>
        </div>

        {/* Average Score */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Avg Score</p>
            <p className="text-4xl font-bold text-primary">
              {averageScorePercentage}%
            </p>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div
                className="h-2 rounded-full bg-primary transition-all duration-1000"
                style={{ width: `${averageScorePercentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Overall performance
            </p>
          </div>
        </div>

        {/* Cards Studied */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Cards Studied</p>
            <p className="text-4xl font-bold text-foreground">
              {stats.totalCards}
            </p>
            <div className="flex justify-center gap-1 mt-2">
              {Array.from({ length: Math.min(stats.totalCards, 10) }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-primary/60" />
              ))}
              {stats.totalCards > 10 && <span className="text-xs text-muted-foreground ml-1">+{stats.totalCards - 10}</span>}
            </div>
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
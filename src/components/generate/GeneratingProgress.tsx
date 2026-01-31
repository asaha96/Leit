import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';

interface GeneratingProgressProps {
  status: string;
  progress?: number;
  onCancel?: () => void;
}

export function GeneratingProgress({ status, progress = 0, onCancel }: GeneratingProgressProps) {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="pt-6 space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Generating Flashcards</h3>
            <p className="text-sm text-muted-foreground">{status}</p>
          </div>
        </div>

        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">
            {progress > 0 ? `${Math.round(progress)}% complete` : 'Starting...'}
          </p>
        </div>

        {onCancel && (
          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

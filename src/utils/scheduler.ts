/**
 * Lightweight spaced repetition scheduler
 * Inspired by FSRS but simplified for MVP
 */

export type Quality = 'again' | 'hard' | 'good' | 'easy';

export function calculateNextDue(quality: Quality): Date {
  const now = new Date();
  
  switch (quality) {
    case 'again':
      return new Date(now.getTime() + 1 * 60 * 1000); // 1 minute
    case 'hard':
      return new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes
    case 'good':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day
    case 'easy':
      return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000); // default 1 day
  }
}

export function isCardDue(nextDue: string): boolean {
  const dueDate = new Date(nextDue);
  return dueDate <= new Date();
}

export function getQualityColor(quality: Quality): string {
  switch (quality) {
    case 'again':
      return 'destructive';
    case 'hard':
      return 'warning';
    case 'good':
      return 'success';
    case 'easy':
      return 'primary';
    default:
      return 'muted';
  }
}

export function getQualityLabel(quality: Quality): string {
  switch (quality) {
    case 'again':
      return 'Again (1m)';
    case 'hard':
      return 'Hard (10m)';
    case 'good':
      return 'Good (1d)';
    case 'easy':
      return 'Easy (3d)';
    default:
      return quality;
  }
}
import { Quality } from './scheduler';

/**
 * Automatic difficulty inference based on response time, answer score, and hint usage
 */

export interface InferenceInput {
  responseTimeMs: number;     // Time from card shown to answer reveal
  answerScore: number;        // 0-1 from evaluator
  hintUsed: boolean;
  cardInterval?: number;      // Current card interval (days) - for adjusting thresholds
}

export interface InferenceResult {
  quality: Quality;           // 'again' | 'hard' | 'good' | 'easy'
  confidence: number;         // 0-1 confidence in inference
  reasoning: string;          // Human-readable explanation
}

// Time thresholds in milliseconds
const QUICK_RESPONSE_MS = 5000;      // 5 seconds
const NORMAL_RESPONSE_MS = 15000;    // 15 seconds
const SLOW_RESPONSE_MS = 30000;      // 30 seconds

// Score thresholds
const CORRECT_THRESHOLD = 0.9;       // Considered correct
const PARTIAL_THRESHOLD = 0.7;       // Partially correct
const WRONG_THRESHOLD = 0.5;         // Wrong

/**
 * Infer the difficulty/quality rating based on user performance
 *
 * Algorithm:
 * | Condition                                    | Quality | Confidence |
 * |----------------------------------------------|---------|------------|
 * | Score < 0.5                                  | again   | 0.9        |
 * | Score < 0.7 OR hint used                     | hard    | 0.8        |
 * | Score >= 0.9 AND time < 5s AND no hint       | easy    | 0.85       |
 * | Score >= 0.7 AND time < 15s                  | good    | 0.8        |
 * | Otherwise                                    | good    | 0.7        |
 */
export function inferDifficulty(input: InferenceInput): InferenceResult {
  const { responseTimeMs, answerScore, hintUsed, cardInterval } = input;

  // Adjust thresholds based on card interval (harder standards for well-known cards)
  const intervalMultiplier = cardInterval && cardInterval > 7 ? 0.9 : 1.0;
  const adjustedQuickTime = QUICK_RESPONSE_MS * intervalMultiplier;
  const adjustedNormalTime = NORMAL_RESPONSE_MS * intervalMultiplier;

  // Format time for reasoning
  const timeStr = formatTime(responseTimeMs);

  // Case 1: Wrong answer (score < 0.5)
  if (answerScore < WRONG_THRESHOLD) {
    return {
      quality: 'again',
      confidence: 0.9,
      reasoning: `Incorrect answer (${Math.round(answerScore * 100)}% match)`
    };
  }

  // Case 2: Partial answer OR used hint
  if (answerScore < PARTIAL_THRESHOLD || hintUsed) {
    const reasons: string[] = [];
    if (answerScore < PARTIAL_THRESHOLD) {
      reasons.push(`partial answer (${Math.round(answerScore * 100)}% match)`);
    }
    if (hintUsed) {
      reasons.push('used hint');
    }
    return {
      quality: 'hard',
      confidence: 0.8,
      reasoning: reasons.join(' and ').replace(/^./, c => c.toUpperCase())
    };
  }

  // Case 3: Correct, quick, no hint -> Easy
  if (answerScore >= CORRECT_THRESHOLD && responseTimeMs < adjustedQuickTime && !hintUsed) {
    return {
      quality: 'easy',
      confidence: 0.85,
      reasoning: `Correct answer in ${timeStr} without hints`
    };
  }

  // Case 4: Correct within normal time -> Good
  if (answerScore >= PARTIAL_THRESHOLD && responseTimeMs < adjustedNormalTime) {
    return {
      quality: 'good',
      confidence: 0.8,
      reasoning: `Correct answer in ${timeStr}`
    };
  }

  // Case 5: Correct but slow -> Still Good but lower confidence
  if (answerScore >= CORRECT_THRESHOLD) {
    // Very slow response suggests some struggle
    if (responseTimeMs > SLOW_RESPONSE_MS) {
      return {
        quality: 'good',
        confidence: 0.65,
        reasoning: `Correct but took ${timeStr} to answer`
      };
    }
    return {
      quality: 'good',
      confidence: 0.7,
      reasoning: `Correct answer in ${timeStr}`
    };
  }

  // Default fallback: Good with lower confidence
  return {
    quality: 'good',
    confidence: 0.6,
    reasoning: `${Math.round(answerScore * 100)}% match in ${timeStr}`
  };
}

/**
 * Format milliseconds to human-readable time string
 */
function formatTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Get color class for confidence display
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.85) return 'text-green-600 dark:text-green-400';
  if (confidence >= 0.7) return 'text-blue-600 dark:text-blue-400';
  if (confidence >= 0.5) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-gray-600 dark:text-gray-400';
}

/**
 * Get badge variant for confidence display
 */
export function getConfidenceBadgeVariant(confidence: number): 'default' | 'secondary' | 'outline' {
  if (confidence >= 0.8) return 'default';
  if (confidence >= 0.6) return 'secondary';
  return 'outline';
}

/**
 * Format confidence as percentage string
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

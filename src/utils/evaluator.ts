import { EvaluationResult } from '@/types/flashcard';

/**
 * Simple answer evaluation logic
 * Normalizes input and checks for matches
 */

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' '); // Collapse whitespace
}

function calculateSimilarity(response: string, expected: string): number {
  const normalizedResponse = normalizeText(response);
  const normalizedExpected = normalizeText(expected);
  
  if (normalizedResponse === normalizedExpected) {
    return 1.0;
  }
  
  // Simple partial match scoring
  if (normalizedResponse.includes(normalizedExpected) || 
      normalizedExpected.includes(normalizedResponse)) {
    return 0.7;
  }
  
  // Levenshtein distance for close matches
  const distance = levenshteinDistance(normalizedResponse, normalizedExpected);
  const maxLength = Math.max(normalizedResponse.length, normalizedExpected.length);
  
  if (maxLength === 0) return 0;
  
  const similarity = 1 - (distance / maxLength);
  return Math.max(0, similarity);
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

export function evaluateAnswer(
  response: string,
  expectedAnswers: string[]
): EvaluationResult {
  if (!response.trim()) {
    return {
      score: 0,
      feedback: 'No answer provided',
      isCorrect: false
    };
  }
  
  let bestScore = 0;
  let bestMatch = '';
  
  // Check against all possible answers
  for (const expected of expectedAnswers) {
    const score = calculateSimilarity(response, expected);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = expected;
    }
  }
  
  // Determine feedback based on score
  let feedback: string;
  let isCorrect: boolean;
  
  if (bestScore >= 0.9) {
    feedback = 'Correct!';
    isCorrect = true;
  } else if (bestScore >= 0.6) {
    feedback = `Close! Expected: "${bestMatch}"`;
    isCorrect = false;
  } else {
    feedback = `Incorrect. Expected: "${bestMatch}"`;
    isCorrect = false;
  }
  
  return {
    score: bestScore,
    feedback,
    isCorrect
  };
}
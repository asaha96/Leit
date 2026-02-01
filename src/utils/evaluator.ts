import { EvaluationResult, MatchType } from '@/types/flashcard';
import { areSynonyms, arePhraseSynonyms, getSynonymSimilarity } from './synonyms';
import { AIService } from '@/services/aiService';

/**
 * Enhanced answer evaluation with multiple matching strategies:
 * 1. Exact match (normalized) - Score: 1.0
 * 2. Synonym match - Score: 0.95
 * 3. Word order flexibility - Score: 0.9
 * 4. Partial/contains match - Score: 0.7
 * 5. Fuzzy/Levenshtein - Score: varies
 * 6. AI semantic matching (optional fallback) - Score: varies
 */

export interface EvaluateOptions {
  useAI?: boolean;
  cardContext?: string;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' '); // Collapse whitespace
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

/**
 * Calculate short answer leniency - allows more typos for longer words
 */
function getAllowedTypos(wordLength: number): number {
  if (wordLength < 4) return 0;
  if (wordLength < 6) return 1;
  return 2;
}

/**
 * Check if a short answer is close enough with typo tolerance
 */
function isShortAnswerMatch(response: string, expected: string): boolean {
  const normResp = normalizeText(response);
  const normExp = normalizeText(expected);

  // For short answers (< 4 words), apply lenient matching
  const respWords = normResp.split(' ');
  const expWords = normExp.split(' ');

  if (respWords.length > 4 || expWords.length > 4) {
    return false;
  }

  // Single word comparison with typo tolerance
  if (respWords.length === 1 && expWords.length === 1) {
    const allowedTypos = getAllowedTypos(normExp.length);
    const distance = levenshteinDistance(normResp, normExp);
    return distance <= allowedTypos;
  }

  return false;
}

/**
 * Check for word order flexibility match
 * e.g., "World War II" = "Second World War" = "WWII"
 */
function checkWordOrderMatch(response: string, expected: string): boolean {
  const normResp = normalizeText(response);
  const normExp = normalizeText(expected);

  // Get words and remove common stop words
  const stopWords = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'and', 'or']);

  const respWords = normResp.split(' ').filter(w => w.length > 0 && !stopWords.has(w)).sort();
  const expWords = normExp.split(' ').filter(w => w.length > 0 && !stopWords.has(w)).sort();

  if (respWords.length === 0 || expWords.length === 0) {
    return false;
  }

  // Check if same words in any order
  if (respWords.length === expWords.length) {
    return respWords.every((word, i) => word === expWords[i] || areSynonyms(word, expWords[i]));
  }

  return false;
}

interface MatchResult {
  score: number;
  matchType: MatchType;
}

/**
 * Calculate similarity using multiple strategies and return best match
 */
function calculateSimilarity(response: string, expected: string): MatchResult {
  const normalizedResponse = normalizeText(response);
  const normalizedExpected = normalizeText(expected);

  // Strategy 1: Exact match after normalization
  if (normalizedResponse === normalizedExpected) {
    return { score: 1.0, matchType: 'exact' };
  }

  // Strategy 2: Synonym match (full phrase)
  if (arePhraseSynonyms(response, expected)) {
    return { score: 0.95, matchType: 'synonym' };
  }

  // Strategy 3: Word order flexibility
  if (checkWordOrderMatch(response, expected)) {
    return { score: 0.9, matchType: 'word_order' };
  }

  // Strategy 4: Short answer leniency (typo tolerance)
  if (isShortAnswerMatch(response, expected)) {
    return { score: 0.9, matchType: 'fuzzy' };
  }

  // Strategy 5: Partial/contains match
  if (normalizedResponse.includes(normalizedExpected) ||
      normalizedExpected.includes(normalizedResponse)) {
    // Longer match = higher score
    const overlap = Math.min(normalizedResponse.length, normalizedExpected.length);
    const maxLen = Math.max(normalizedResponse.length, normalizedExpected.length);
    const partialScore = 0.6 + (overlap / maxLen) * 0.2; // 0.6-0.8 range
    return { score: partialScore, matchType: 'fuzzy' };
  }

  // Strategy 6: Synonym word similarity
  const synonymScore = getSynonymSimilarity(response, expected);
  if (synonymScore >= 0.7) {
    return { score: synonymScore, matchType: 'synonym' };
  }

  // Strategy 7: Levenshtein distance for close matches
  const distance = levenshteinDistance(normalizedResponse, normalizedExpected);
  const maxLength = Math.max(normalizedResponse.length, normalizedExpected.length);

  if (maxLength === 0) {
    return { score: 0, matchType: 'none' };
  }

  const fuzzyScore = Math.max(0, 1 - (distance / maxLength));
  return { score: fuzzyScore, matchType: fuzzyScore >= 0.5 ? 'fuzzy' : 'none' };
}

/**
 * Evaluate answer synchronously (without AI fallback)
 */
export function evaluateAnswer(
  response: string,
  expectedAnswers: string[]
): EvaluationResult {
  if (!response.trim()) {
    return {
      score: 0,
      feedback: 'No answer provided',
      isCorrect: false,
      matchType: 'none',
      aiUsed: false
    };
  }

  let bestScore = 0;
  let bestMatch = '';
  let bestMatchType: MatchType = 'none';

  // Check against all possible answers
  for (const expected of expectedAnswers) {
    const result = calculateSimilarity(response, expected);
    if (result.score > bestScore) {
      bestScore = result.score;
      bestMatch = expected;
      bestMatchType = result.matchType;
    }
  }

  // Determine feedback based on score and match type
  let feedback: string;
  let isCorrect: boolean;

  if (bestScore >= 0.9) {
    const matchInfo = bestMatchType !== 'exact' ? ` (${formatMatchType(bestMatchType)})` : '';
    feedback = `Correct!${matchInfo}`;
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
    isCorrect,
    matchType: bestMatchType,
    aiUsed: false
  };
}

/**
 * Evaluate answer with optional AI fallback for uncertain cases
 */
export async function evaluateAnswerAsync(
  response: string,
  expectedAnswers: string[],
  options?: EvaluateOptions
): Promise<EvaluationResult> {
  // First, try built-in matching
  const builtInResult = evaluateAnswer(response, expectedAnswers);

  // If clear correct or clearly wrong, return immediately
  if (builtInResult.score >= 0.9 || builtInResult.score < 0.4) {
    return builtInResult;
  }

  // In the uncertain range (0.4-0.9), optionally use AI
  if (options?.useAI) {
    try {
      const aiResult = await evaluateWithAI(response, expectedAnswers, options.cardContext);
      if (aiResult) {
        return aiResult;
      }
    } catch (error) {
      console.error('AI evaluation failed, using built-in result:', error);
    }
  }

  return builtInResult;
}

/**
 * Use AI to evaluate semantic equivalence of answers
 */
async function evaluateWithAI(
  response: string,
  expectedAnswers: string[],
  cardContext?: string
): Promise<EvaluationResult | null> {
  const isAvailable = await AIService.isAvailable();
  if (!isAvailable) {
    return null;
  }

  const expectedList = expectedAnswers.join('" or "');
  const contextInfo = cardContext ? `\nQuestion context: ${cardContext}` : '';

  const messages = [
    {
      role: 'system' as const,
      content: `You are an answer evaluator for flashcards. Determine if the user's answer is semantically equivalent to the expected answer(s). Consider synonyms, paraphrases, and different wordings that convey the same meaning.

Reply in JSON format: {"result": "YES" | "PARTIAL" | "NO", "reason": "brief explanation"}
- YES: Answers are semantically equivalent (allow for synonyms, abbreviations, slight wording differences)
- PARTIAL: Answer is partially correct or contains the right idea but is incomplete
- NO: Answer is incorrect or conveys a different meaning`
    },
    {
      role: 'user' as const,
      content: `Expected answer: "${expectedList}"
User's answer: "${response}"${contextInfo}

Are these answers semantically equivalent?`
    }
  ];

  const aiResponse = await AIService.chat(messages, 150);
  if (!aiResponse) {
    return null;
  }

  try {
    // Try to parse JSON response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const result = parsed.result?.toUpperCase();
      const reason = parsed.reason || '';

      let score: number;
      let isCorrect: boolean;
      let feedback: string;

      switch (result) {
        case 'YES':
          score = 0.95;
          isCorrect = true;
          feedback = `Correct! (AI: ${reason})`;
          break;
        case 'PARTIAL':
          score = 0.7;
          isCorrect = false;
          feedback = `Partially correct. ${reason}`;
          break;
        case 'NO':
        default:
          score = 0.3;
          isCorrect = false;
          feedback = `Incorrect. ${reason}`;
      }

      return {
        score,
        feedback,
        isCorrect,
        matchType: 'ai',
        aiUsed: true
      };
    }
  } catch {
    // JSON parsing failed, return null to use built-in result
  }

  return null;
}

/**
 * Format match type for user display
 */
function formatMatchType(matchType: MatchType): string {
  switch (matchType) {
    case 'synonym':
      return 'synonym match';
    case 'word_order':
      return 'word order match';
    case 'fuzzy':
      return 'close match';
    case 'ai':
      return 'AI verified';
    default:
      return matchType;
  }
}

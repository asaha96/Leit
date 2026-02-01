import { describe, it, expect } from 'vitest';
import { evaluateAnswer } from '../src/utils/evaluator';
import { areSynonyms, arePhraseSynonyms, getSynonymSimilarity } from '../src/utils/synonyms';
import { inferDifficulty } from '../src/utils/difficultyInference';

describe('Synonym Dictionary', () => {
  describe('areSynonyms', () => {
    it('should match USA synonyms', () => {
      expect(areSynonyms('USA', 'United States')).toBe(true);
      expect(areSynonyms('usa', 'america')).toBe(true);
      expect(areSynonyms('US', 'U.S.A.')).toBe(true);
    });

    it('should match number synonyms', () => {
      expect(areSynonyms('1', 'one')).toBe(true);
      expect(areSynonyms('2', 'two')).toBe(true);
      expect(areSynonyms('12', 'twelve')).toBe(true);
    });

    it('should match science synonyms', () => {
      expect(areSynonyms('H2O', 'water')).toBe(true);
      expect(areSynonyms('CO2', 'carbon dioxide')).toBe(true);
    });

    it('should return false for non-synonyms', () => {
      expect(areSynonyms('USA', 'UK')).toBe(false);
      expect(areSynonyms('water', 'fire')).toBe(false);
    });
  });

  describe('arePhraseSynonyms', () => {
    it('should match phrases with word order flexibility', () => {
      expect(arePhraseSynonyms('World War 1', 'WW1')).toBe(true);
      expect(arePhraseSynonyms('World War II', 'WWII')).toBe(true);
    });

    it('should handle stop words in phrases', () => {
      expect(arePhraseSynonyms('the United States', 'United States')).toBe(true);
    });
  });

  describe('getSynonymSimilarity', () => {
    it('should return high score for synonym matches', () => {
      expect(getSynonymSimilarity('USA', 'United States')).toBeGreaterThanOrEqual(0.9);
    });

    it('should return 0 for unrelated words', () => {
      expect(getSynonymSimilarity('apple', 'banana')).toBe(0);
    });
  });
});

describe('Enhanced Evaluator', () => {
  describe('evaluateAnswer', () => {
    describe('exact match', () => {
      it('should score 1.0 for exact match', () => {
        const result = evaluateAnswer('Paris', ['Paris']);
        expect(result.score).toBe(1.0);
        expect(result.isCorrect).toBe(true);
        expect(result.matchType).toBe('exact');
      });

      it('should be case insensitive', () => {
        const result = evaluateAnswer('PARIS', ['Paris']);
        expect(result.score).toBe(1.0);
        expect(result.isCorrect).toBe(true);
      });

      it('should ignore punctuation', () => {
        const result = evaluateAnswer("Paris!", ['Paris']);
        expect(result.score).toBe(1.0);
        expect(result.isCorrect).toBe(true);
      });
    });

    describe('synonym match', () => {
      it('should match USA = United States', () => {
        const result = evaluateAnswer('USA', ['United States']);
        expect(result.score).toBeGreaterThanOrEqual(0.9);
        expect(result.isCorrect).toBe(true);
        expect(result.matchType).toBe('synonym');
      });

      it('should match water = H2O', () => {
        const result = evaluateAnswer('water', ['H2O']);
        expect(result.score).toBeGreaterThanOrEqual(0.9);
        expect(result.isCorrect).toBe(true);
      });

      it('should match numbers', () => {
        const result = evaluateAnswer('one', ['1']);
        expect(result.score).toBeGreaterThanOrEqual(0.9);
        expect(result.isCorrect).toBe(true);
      });
    });

    describe('fuzzy match (typo tolerance)', () => {
      it('should accept 1 typo for short words', () => {
        const result = evaluateAnswer('Pari', ['Paris']);
        expect(result.score).toBeGreaterThanOrEqual(0.8);
      });

      it('should accept 2 typos for longer words', () => {
        const result = evaluateAnswer('Califrnia', ['California']);
        expect(result.score).toBeGreaterThanOrEqual(0.7);
      });
    });

    describe('partial match', () => {
      it('should give partial credit for substring', () => {
        const result = evaluateAnswer('United', ['United States']);
        expect(result.score).toBeGreaterThan(0.5);
        expect(result.score).toBeLessThan(0.9);
      });
    });

    describe('incorrect answers', () => {
      it('should score low for wrong answers', () => {
        const result = evaluateAnswer('London', ['Paris']);
        expect(result.score).toBeLessThan(0.5);
        expect(result.isCorrect).toBe(false);
      });

      it('should handle empty response', () => {
        const result = evaluateAnswer('', ['Paris']);
        expect(result.score).toBe(0);
        expect(result.isCorrect).toBe(false);
        expect(result.feedback).toBe('No answer provided');
      });
    });

    describe('multiple expected answers', () => {
      it('should accept any correct answer', () => {
        const result = evaluateAnswer('USA', ['United States', 'USA', 'America']);
        expect(result.score).toBe(1.0);
        expect(result.isCorrect).toBe(true);
      });
    });

    describe('feedback messages', () => {
      it('should show match type for non-exact matches', () => {
        const result = evaluateAnswer('USA', ['United States']);
        expect(result.feedback).toContain('Correct');
        expect(result.feedback).toContain('synonym');
      });
    });
  });
});

describe('Difficulty Inference', () => {
  describe('inferDifficulty', () => {
    it('should infer "again" for wrong answers', () => {
      const result = inferDifficulty({
        responseTimeMs: 5000,
        answerScore: 0.3,
        hintUsed: false
      });
      expect(result.quality).toBe('again');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should infer "hard" when hint is used', () => {
      const result = inferDifficulty({
        responseTimeMs: 5000,
        answerScore: 0.95,
        hintUsed: true
      });
      expect(result.quality).toBe('hard');
      expect(result.reasoning).toContain('hint');
    });

    it('should infer "hard" for partial answers', () => {
      const result = inferDifficulty({
        responseTimeMs: 5000,
        answerScore: 0.65,
        hintUsed: false
      });
      expect(result.quality).toBe('hard');
    });

    it('should infer "easy" for quick correct answers without hint', () => {
      const result = inferDifficulty({
        responseTimeMs: 3000, // 3 seconds
        answerScore: 0.95,
        hintUsed: false
      });
      expect(result.quality).toBe('easy');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should infer "good" for normal correct answers', () => {
      const result = inferDifficulty({
        responseTimeMs: 10000, // 10 seconds
        answerScore: 0.9,
        hintUsed: false
      });
      expect(result.quality).toBe('good');
    });

    it('should infer "good" with lower confidence for slow answers', () => {
      const result = inferDifficulty({
        responseTimeMs: 45000, // 45 seconds
        answerScore: 0.95,
        hintUsed: false
      });
      expect(result.quality).toBe('good');
      expect(result.confidence).toBeLessThan(0.7);
    });

    it('should include reasoning in the result', () => {
      const result = inferDifficulty({
        responseTimeMs: 3000,
        answerScore: 0.95,
        hintUsed: false
      });
      expect(result.reasoning).toBeTruthy();
      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });
});

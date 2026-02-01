/**
 * Synonym dictionary for lenient answer matching
 * Provides built-in synonyms for common educational terms
 */

// Map of canonical terms to their synonyms (lowercase, normalized)
const SYNONYMS: Record<string, string[]> = {
  // Numbers
  '0': ['zero', 'nil', 'none', 'o'],
  '1': ['one', 'i', 'single', 'first'],
  '2': ['two', 'ii', 'second', 'pair', 'couple'],
  '3': ['three', 'iii', 'third'],
  '4': ['four', 'iv', 'fourth'],
  '5': ['five', 'v', 'fifth'],
  '6': ['six', 'vi', 'sixth'],
  '7': ['seven', 'vii', 'seventh'],
  '8': ['eight', 'viii', 'eighth'],
  '9': ['nine', 'ix', 'ninth'],
  '10': ['ten', 'x', 'tenth'],
  '11': ['eleven', 'xi', 'eleventh'],
  '12': ['twelve', 'xii', 'twelfth', 'dozen'],
  '100': ['hundred', 'c'],
  '1000': ['thousand', 'm', 'k'],

  // Countries and regions
  'usa': ['united states', 'america', 'us', 'u.s.', 'u.s.a.', 'united states of america', 'the united states'],
  'uk': ['united kingdom', 'britain', 'great britain', 'england', 'u.k.'],
  'ussr': ['soviet union', 'russia', 'u.s.s.r.'],
  'uae': ['united arab emirates', 'u.a.e.'],
  'prc': ['china', 'peoples republic of china', "people's republic of china"],

  // Math operations
  'add': ['addition', 'plus', 'sum'],
  'subtract': ['subtraction', 'minus', 'difference'],
  'multiply': ['multiplication', 'times', 'product'],
  'divide': ['division', 'quotient', 'split'],
  'equals': ['equal', 'is', '='],

  // Math terms
  'percent': ['percentage', '%'],
  'infinity': ['infinite', '∞'],
  'pi': ['π', '3.14159', '3.14'],

  // Science - Chemistry
  'h2o': ['water', 'dihydrogen monoxide'],
  'co2': ['carbon dioxide'],
  'o2': ['oxygen', 'dioxygen'],
  'n2': ['nitrogen', 'dinitrogen'],
  'nacl': ['salt', 'sodium chloride', 'table salt'],
  'hcl': ['hydrochloric acid'],
  'h2so4': ['sulfuric acid', 'sulphuric acid'],
  'naoh': ['sodium hydroxide', 'lye', 'caustic soda'],

  // Science - Biology
  'dna': ['deoxyribonucleic acid'],
  'rna': ['ribonucleic acid'],
  'atp': ['adenosine triphosphate'],

  // Science - Physics
  'c': ['speed of light', '299792458 m/s', '3e8 m/s'],
  'e=mc2': ['e=mc²', 'mass energy equivalence', 'einstein equation'],

  // Units
  'km': ['kilometer', 'kilometres', 'kilometers'],
  'm': ['meter', 'metre', 'meters', 'metres'],
  'cm': ['centimeter', 'centimetre', 'centimeters', 'centimetres'],
  'mm': ['millimeter', 'millimetre', 'millimeters', 'millimetres'],
  'kg': ['kilogram', 'kilograms', 'kilo', 'kilos'],
  'g': ['gram', 'grams'],
  'mg': ['milligram', 'milligrams'],
  'l': ['liter', 'litre', 'liters', 'litres'],
  'ml': ['milliliter', 'millilitre', 'milliliters', 'millilitres'],
  'mi': ['mile', 'miles'],
  'ft': ['foot', 'feet'],
  'in': ['inch', 'inches'],
  'lb': ['pound', 'pounds', 'lbs'],
  'oz': ['ounce', 'ounces'],

  // Time
  'sec': ['second', 'seconds', 's'],
  'min': ['minute', 'minutes'],
  'hr': ['hour', 'hours', 'h'],
  'yr': ['year', 'years'],
  'bc': ['bce', 'b.c.', 'b.c.e.', 'before christ', 'before common era'],
  'ad': ['ce', 'a.d.', 'c.e.', 'anno domini', 'common era'],

  // Directions
  'n': ['north', 'northern'],
  's': ['south', 'southern'],
  'e': ['east', 'eastern'],
  'w': ['west', 'western'],
  'ne': ['northeast', 'north east', 'north-east'],
  'nw': ['northwest', 'north west', 'north-west'],
  'se': ['southeast', 'south east', 'south-east'],
  'sw': ['southwest', 'south west', 'south-west'],

  // Common abbreviations
  'vs': ['versus', 'against', 'v.', 'v'],
  'etc': ['et cetera', 'and so on', 'and so forth'],
  'ie': ['i.e.', 'that is', 'in other words'],
  'eg': ['e.g.', 'for example', 'for instance'],

  // Historical periods/events
  'ww1': ['world war 1', 'world war i', 'first world war', 'wwi', 'the great war'],
  'ww2': ['world war 2', 'world war ii', 'second world war', 'wwii'],

  // Common educational terms
  'definition': ['meaning', 'def'],
  'example': ['instance', 'eg', 'e.g.'],
  'true': ['yes', 'correct', 't', 'y'],
  'false': ['no', 'incorrect', 'f', 'n', 'wrong'],
};

// Build reverse lookup map for efficiency
const REVERSE_LOOKUP: Map<string, string> = new Map();

function buildReverseLookup(): void {
  for (const [canonical, synonyms] of Object.entries(SYNONYMS)) {
    // Map canonical to itself
    REVERSE_LOOKUP.set(canonical.toLowerCase(), canonical.toLowerCase());
    // Map all synonyms to canonical
    for (const synonym of synonyms) {
      REVERSE_LOOKUP.set(synonym.toLowerCase(), canonical.toLowerCase());
    }
  }
}

// Initialize on module load
buildReverseLookup();

/**
 * Normalize text for synonym comparison
 */
function normalizeForSynonym(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s.]/g, '') // Keep periods for abbreviations
    .replace(/\s+/g, ' ');
}

/**
 * Get the canonical form of a word if it has one
 */
function getCanonical(word: string): string | null {
  const normalized = normalizeForSynonym(word);
  return REVERSE_LOOKUP.get(normalized) || null;
}

/**
 * Check if two words/phrases are synonyms
 */
export function areSynonyms(word1: string, word2: string): boolean {
  const normalized1 = normalizeForSynonym(word1);
  const normalized2 = normalizeForSynonym(word2);

  // Direct match after normalization
  if (normalized1 === normalized2) {
    return true;
  }

  // Check if both map to the same canonical form
  const canonical1 = getCanonical(word1);
  const canonical2 = getCanonical(word2);

  if (canonical1 && canonical2 && canonical1 === canonical2) {
    return true;
  }

  return false;
}

/**
 * Get all synonyms for a word/phrase
 */
export function getSynonyms(word: string): string[] {
  const canonical = getCanonical(word);
  if (!canonical) {
    return [];
  }

  // Return all synonyms including canonical form
  const synonyms = SYNONYMS[canonical] || [];
  return [canonical, ...synonyms];
}

/**
 * Check if two multi-word phrases are synonymous
 * Handles word order flexibility (e.g., "World War II" = "Second World War")
 */
export function arePhraseSynonyms(phrase1: string, phrase2: string): boolean {
  // First check direct synonym match
  if (areSynonyms(phrase1, phrase2)) {
    return true;
  }

  // For single words, we're done
  const words1 = normalizeForSynonym(phrase1).split(' ').filter(w => w.length > 0);
  const words2 = normalizeForSynonym(phrase2).split(' ').filter(w => w.length > 0);

  if (words1.length === 1 && words2.length === 1) {
    return false;
  }

  // Check if the phrases contain the same set of meaningful words (word order flexibility)
  // Remove common stop words for comparison
  const stopWords = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'and', 'or', 'is', 'are', 'was', 'were']);

  const meaningful1 = words1.filter(w => !stopWords.has(w)).sort();
  const meaningful2 = words2.filter(w => !stopWords.has(w)).sort();

  if (meaningful1.length === meaningful2.length && meaningful1.length > 0) {
    let allMatch = true;
    for (let i = 0; i < meaningful1.length; i++) {
      if (meaningful1[i] !== meaningful2[i] && !areSynonyms(meaningful1[i], meaningful2[i])) {
        allMatch = false;
        break;
      }
    }
    if (allMatch) {
      return true;
    }
  }

  return false;
}

/**
 * Get a similarity score for synonym matching (0-1)
 * Returns the proportion of words that are synonymous
 */
export function getSynonymSimilarity(text1: string, text2: string): number {
  // Check for full phrase synonym match first
  if (arePhraseSynonyms(text1, text2)) {
    return 0.95;
  }

  const words1 = normalizeForSynonym(text1).split(' ').filter(w => w.length > 0);
  const words2 = normalizeForSynonym(text2).split(' ').filter(w => w.length > 0);

  if (words1.length === 0 || words2.length === 0) {
    return 0;
  }

  // Count words in text1 that have a synonym in text2
  let matchedWords = 0;
  const usedIndices = new Set<number>();

  for (const word1 of words1) {
    for (let j = 0; j < words2.length; j++) {
      if (usedIndices.has(j)) continue;
      if (word1 === words2[j] || areSynonyms(word1, words2[j])) {
        matchedWords++;
        usedIndices.add(j);
        break;
      }
    }
  }

  // Calculate similarity as proportion of matched words
  const maxWords = Math.max(words1.length, words2.length);
  return matchedWords / maxWords;
}

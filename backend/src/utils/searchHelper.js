/**
 * Material Description Duplicate Detection Utilities
 * Supports: normalization, sorted-word key, Jaccard similarity, Levenshtein fuzzy match
 */

// Remove punctuation, lowercase, collapse spaces, sort words → deterministic key
// "Steel Rod 10mm" and "10mm steel rod" → same key "10mm rod steel"
const normalizeDescription = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')   // strip punctuation
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .sort()
    .join(' ');
};

// Levenshtein distance between two strings
const levenshtein = (a, b) => {
  if (!a) return b ? b.length : 0;
  if (!b) return a.length;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
};

// Jaccard similarity on word sets (0–1)
const jaccardSimilarity = (a, b) => {
  const setA = new Set(a.split(' ').filter(Boolean));
  const setB = new Set(b.split(' ').filter(Boolean));
  if (setA.size === 0 && setB.size === 0) return 1;
  const intersection = [...setA].filter(w => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
};

// Levenshtein-based similarity (0–1)
const levenshteinSimilarity = (a, b) => {
  if (!a && !b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
};

/**
 * Combined similarity score (0–100) between two normalized keys.
 * Weights: 60% Jaccard (word overlap) + 40% Levenshtein (character similarity)
 */
const similarityScore = (normA, normB) => {
  if (normA === normB) return 100;
  if (!normA || !normB) return 0;
  const jaccard = jaccardSimilarity(normA, normB);
  const lev = levenshteinSimilarity(normA, normB);
  return Math.round((jaccard * 0.6 + lev * 0.4) * 100);
};

// Threshold: >= 80% is considered a duplicate
const DUPLICATE_THRESHOLD = 80;

module.exports = {
  normalizeDescription,
  similarityScore,
  DUPLICATE_THRESHOLD,
};

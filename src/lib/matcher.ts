import { MenuItem, ParsedOrderItem } from '../types';
import { RawOrderEntry } from './parser';

/**
 * Normalize text for comparison:
 * - Remove all whitespace
 * - Remove parentheses and their content variations like (특) vs 특
 * - Convert to lowercase
 */
export function normalize(text: string): string {
  return text
    .replace(/\s+/g, '')
    .replace(/[()（）]/g, '')
    .toLowerCase();
}

/**
 * Calculate Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity between two strings (0 to 1).
 */
export function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(na, nb) / maxLen;
}

let idCounter = 0;
function generateId(): string {
  return `order-${Date.now()}-${idCounter++}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

/**
 * Match a single raw order entry against the menu items of the selected restaurant.
 * 
 * Priority:
 * 1. Exact match on menu name (normalized) -> confirmed
 * 2. Exact match on any alias (normalized) -> confirmed
 * 3. Similarity >= 0.7 AND significantly better than 2nd candidate -> confirmed
 * 4. Has candidates with similarity >= 0.5 -> ambiguous (with candidate list)
 * 5. Otherwise -> error
 */
export function matchMenu(
  entry: RawOrderEntry,
  menuItems: MenuItem[]
): ParsedOrderItem {
  const inputNorm = normalize(entry.text);

  // 1. Exact match on menu name
  for (const item of menuItems) {
    if (normalize(item.name) === inputNorm) {
      return {
        id: generateId(),
        rawText: entry.text,
        matchedMenuId: item.id,
        matchedMenuName: item.name,
        quantity: entry.quantity,
        status: 'confirmed',
      };
    }
  }

  // 2. Exact match on alias
  for (const item of menuItems) {
    for (const alias of item.aliases) {
      if (normalize(alias) === inputNorm) {
        return {
          id: generateId(),
          rawText: entry.text,
          matchedMenuId: item.id,
          matchedMenuName: item.name,
          quantity: entry.quantity,
          status: 'confirmed',
        };
      }
    }
  }

  // 3 & 4. Similarity-based matching
  const candidates = menuItems
    .map(item => {
      // Check similarity against menu name and all aliases, take the best
      const nameSim = similarity(entry.text, item.name);
      const aliasSims = item.aliases.map(alias => similarity(entry.text, alias));
      const bestSim = Math.max(nameSim, ...aliasSims);
      return { menuId: item.id, menuName: item.name, similarity: bestSim };
    })
    .filter(c => c.similarity >= 0.4)
    .sort((a, b) => b.similarity - a.similarity);

  if (candidates.length > 0) {
    const best = candidates[0];
    const second = candidates.length > 1 ? candidates[1] : null;

    // Auto-confirm if similarity >= 0.7 and significantly better than 2nd
    if (best.similarity >= 0.7 && (!second || best.similarity - second.similarity >= 0.15)) {
      return {
        id: generateId(),
        rawText: entry.text,
        matchedMenuId: best.menuId,
        matchedMenuName: best.menuName,
        quantity: entry.quantity,
        status: 'confirmed',
      };
    }

    // Ambiguous - provide candidates
    if (best.similarity >= 0.5) {
      return {
        id: generateId(),
        rawText: entry.text,
        matchedMenuId: null,
        matchedMenuName: null,
        quantity: entry.quantity,
        status: 'ambiguous',
        candidates: candidates.filter(c => c.similarity >= 0.4),
      };
    }
  }

  // 5. Error - no match found
  return {
    id: generateId(),
    rawText: entry.text,
    matchedMenuId: null,
    matchedMenuName: null,
    quantity: entry.quantity,
    status: 'error',
  };
}

/**
 * Process all raw entries and match them against menu items.
 */
export function matchAllEntries(
  entries: RawOrderEntry[],
  menuItems: MenuItem[]
): ParsedOrderItem[] {
  return entries.map(entry => matchMenu(entry, menuItems));
}

import {
  CaptureProvider,
  CaptureContext,
  RawCaptureOutput,
  RawParsedLine,
  SkuCandidate,
} from "./types";
import { classifyUnitWord } from "./units";
import { normalizeOrderMessage } from "./sanitizer";

// Hindi number words map
const HINDI_NUMBER_WORDS: Record<string, number> = {
  ek: 1,
  do: 2,
  teen: 3,
  tin: 3,
  char: 4,
  chaar: 4,
  paanch: 5,
  panch: 5,
  chhe: 6,
  che: 6,
  saat: 7,
  sat: 7,
  aath: 8,
  ath: 8,
  nau: 9,
  das: 10,
  gyarah: 11,
  barah: 12,
  pandrah: 15,
  bees: 20,
  bis: 20,
  pachees: 25,
  pachis: 25,
  tees: 30,
  tis: 30,
  pachaas: 50,
  pachas: 50,
  ekso: 100,
  sau: 100,
};

/**
 * Trigram similarity metric between two strings (0..1).
 */
export function calculateTrigramSimilarity(str1: string, str2: string): number {
  const s1 = `  ${str1.toLowerCase().trim()} `;
  const s2 = `  ${str2.toLowerCase().trim()} `;

  if (s1 === s2) return 1.0;
  if (s1.length < 3 || s2.length < 3) return 0.0;

  const trigrams1 = new Set<string>();
  for (let i = 0; i < s1.length - 2; i++) {
    trigrams1.add(s1.substring(i, i + 3));
  }

  let intersection = 0;
  for (let i = 0; i < s2.length - 2; i++) {
    const t = s2.substring(i, i + 3);
    if (trigrams1.has(t)) {
      intersection++;
    }
  }

  return (2.0 * intersection) / (trigrams1.size + (s2.length - 2));
}

export class RuleBasedProvider implements CaptureProvider {
  name = "RuleBasedProvider";

  async parse(rawText: string, context: CaptureContext): Promise<RawCaptureOutput> {
    const normalized = normalizeOrderMessage(rawText);
    if (!normalized) {
      return { lines: [] };
    }

    // Split text into lines/clauses
    // Delimiters: newlines, commas, "aur", "and", "+", "&"
    const clauses = normalized
      .split(/\n|,|\baur\b|\band\b|\+|\&/i)
      .map((c) => c.trim())
      .filter((c) => c.length > 0 && !/^(bhaiya|namaste|sir|hello|bhai)$/i.test(c));

    const parsedLines: RawParsedLine[] = [];

    for (const clause of clauses) {
      const parsed = this.parseClause(clause, context);
      if (parsed) {
        parsedLines.push(parsed);
      }
    }

    return { lines: parsedLines };
  }

  private parseClause(clause: string, context: CaptureContext): RawParsedLine | null {
    // 1. Extract quantity and unit
    const { quantity, unit, unitWord, cleanText } = this.extractQuantityAndUnit(clause);

    // 2. Score candidate SKUs
    const candidates = this.matchSkuCandidates(cleanText, context);

    return {
      originalText: clause,
      candidates,
      quantity,
      unit,
      unitWord,
    };
  }

  private extractQuantityAndUnit(text: string): {
    quantity: number | null;
    unit: "case" | "piece" | "unknown";
    unitWord?: string;
    cleanText: string;
  } {
    const lower = text.toLowerCase();
    let qty: number | null = null;
    let unitWord: string | undefined = undefined;

    // Pattern 1: Explicit digit followed by a wholesale/retail unit word (e.g. "5 peti", "2 carton", "10 packet", "1 peti")
    const explicitUnitMatch = lower.match(
      /(\d+)\s*(peti|carton|case|dabba|box|packet|pcs|piece|nag|pkt)\b/i
    );

    if (explicitUnitMatch) {
      qty = parseInt(explicitUnitMatch[1], 10);
      unitWord = explicitUnitMatch[2];
    }

    // Pattern 2: Hindi number word followed by unit (e.g. "paanch peti", "do carton", "ek packet")
    if (qty === null) {
      for (const [word, num] of Object.entries(HINDI_NUMBER_WORDS)) {
        const regex = new RegExp(`\\b${word}\\b\\s*(peti|carton|case|dabba|box|packet|pcs|piece|nag|pkt)\\b`, "i");
        const match = lower.match(regex);
        if (match) {
          qty = num;
          unitWord = match[1];
          break;
        }
      }
    }

    // Pattern 3: Standalone number not followed by variant/weight indicators (e.g. "chai patti 250 wala 5")
    if (qty === null) {
      const numRegex = /\b(\d+)\b(?!\s*(?:g|gm|gram|ml|kilo|kg|wala|wali|l|litre))/gi;
      let m: RegExpExecArray | null;
      const standaloneMatches: RegExpExecArray[] = [];
      while ((m = numRegex.exec(lower)) !== null) {
        standaloneMatches.push(m);
      }
      if (standaloneMatches.length > 0) {
        const lastMatch = standaloneMatches[standaloneMatches.length - 1];
        qty = parseInt(lastMatch[1], 10);
      }
    }

    // Pattern 4: Standalone Hindi number word without unit
    if (qty === null) {
      for (const [word, num] of Object.entries(HINDI_NUMBER_WORDS)) {
        const regex = new RegExp(`\\b${word}\\b`, "i");
        if (regex.test(lower)) {
          qty = num;
          break;
        }
      }
    }

    // Check standalone unit words if unitWord not yet found
    if (!unitWord) {
      const unitRegex = /\b(peti|carton|case|dabba|box|packet|pcs|piece|nag|pkt)\b/i;
      const match = lower.match(unitRegex);
      if (match) {
        unitWord = match[1];
      }
    }

    const { unit, matchedWord } = classifyUnitWord(unitWord);

    // Clean text: strip the extracted order quantity and unit keyword to leave product keywords
    let clean = lower;
    if (qty !== null && unitWord) {
      clean = clean.replace(new RegExp(`\\b${qty}\\s*${unitWord}\\b`, "i"), " ");
      for (const [word, num] of Object.entries(HINDI_NUMBER_WORDS)) {
        if (num === qty) {
          clean = clean.replace(new RegExp(`\\b${word}\\s*${unitWord}\\b`, "i"), " ");
        }
      }
    } else if (qty !== null) {
      // replace standalone quantity
      clean = clean.replace(new RegExp(`\\b${qty}\\b(?!\s*(?:g|gm|gram|ml|kilo|kg|wala|wali))`, "i"), " ");
    }

    clean = clean.replace(/\b(peti|carton|case|dabba|box|packet|pcs|piece|nag|pkt)\b/gi, " ");
    clean = clean.replace(/\b(bhaiya|chahiye|bhejo|de do|dena|aur|ka|ki|wala|wali)\b/gi, " ");
    clean = clean.replace(/[ ]{2,}/g, " ").trim();

    return {
      quantity: qty,
      unit,
      unitWord: matchedWord || unitWord,
      cleanText: clean.length > 0 ? clean : text,
    };
  }

  private matchSkuCandidates(cleanText: string, context: CaptureContext): SkuCandidate[] {
    const text = cleanText.toLowerCase().trim();
    const scoredList: Array<{ skuCode: string; score: number }> = [];

    // 1. Exact match against Retailer Aliases
    const aliasSkuCode = context.retailerAliases[text];
    if (aliasSkuCode) {
      scoredList.push({ skuCode: aliasSkuCode, score: 0.95 });
    }

    // 2. Score across all SKUs in catalog
    for (const sku of context.catalogue) {
      let maxScore = 0;

      // Check keyword aliases
      for (const kw of sku.keywords) {
        const kwLower = kw.toLowerCase().trim();
        if (text.includes(kwLower) || kwLower.includes(text)) {
          maxScore = Math.max(maxScore, 0.90);
        } else {
          const sim = calculateTrigramSimilarity(text, kwLower);
          maxScore = Math.max(maxScore, sim * 0.85);
        }
      }

      // Check SKU names (en & hi)
      const nameSimEn = calculateTrigramSimilarity(text, sku.nameEn.toLowerCase());
      const nameSimHi = calculateTrigramSimilarity(text, sku.nameHi.toLowerCase());
      maxScore = Math.max(maxScore, nameSimEn * 0.82, nameSimHi * 0.82);

      // Boost for past orders (+0.05)
      if (context.pastOrderSkuCodes.includes(sku.code)) {
        maxScore = Math.min(1.0, maxScore + 0.05);
      }

      if (maxScore > 0.40) {
        scoredList.push({
          skuCode: sku.code,
          score: Math.round(maxScore * 100) / 100,
        });
      }
    }

    // Sort descending by score, deduplicate, and return top 3
    scoredList.sort((a, b) => b.score - a.score);

    const seen = new Set<string>();
    const topCandidates: SkuCandidate[] = [];

    for (const item of scoredList) {
      if (!seen.has(item.skuCode)) {
        seen.add(item.skuCode);
        topCandidates.push(item);
        if (topCandidates.length >= 3) break;
      }
    }

    return topCandidates;
  }
}

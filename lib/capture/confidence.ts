import { ConfidenceLevel, SkuCandidate } from "./types";

export const CONFIDENCE_HIGH_THRESHOLD = 0.85;
export const CONFIDENCE_MEDIUM_THRESHOLD = 0.60;
export const ALIAS_BOOST = 0.15;
export const AMBIGUITY_PENALTY = 0.10;
export const AMBIGUITY_MARGIN = 0.10;

/**
 * Calibrates confidence score deterministically on the server.
 * Ensures the system never relies on uncalibrated LLM confidence numbers.
 */
export function calibrateConfidence(params: {
  rawScore: number;
  isAliasMatch: boolean;
  candidates: SkuCandidate[];
}): { confidence: ConfidenceLevel; calibratedScore: number; isAmbiguous: boolean } {
  const { rawScore, isAliasMatch, candidates } = params;

  let score = Math.max(0, Math.min(1, rawScore));

  // 1. Boost for confirmed retailer aliases
  if (isAliasMatch) {
    score = Math.min(1.0, score + ALIAS_BOOST);
  }

  // 2. Ambiguity check: if top 2 candidates are within 0.10 margin
  let isAmbiguous = false;
  if (candidates.length >= 2) {
    const diff = Math.abs(candidates[0].score - candidates[1].score);
    if (diff <= AMBIGUITY_MARGIN) {
      isAmbiguous = true;
      score = Math.max(0, score - AMBIGUITY_PENALTY);
    }
  }

  // 3. Assign categorical confidence label
  let confidence: ConfidenceLevel = "Low";
  if (score >= CONFIDENCE_HIGH_THRESHOLD) {
    confidence = "High";
  } else if (score >= CONFIDENCE_MEDIUM_THRESHOLD) {
    confidence = "Medium";
  }

  return {
    confidence,
    calibratedScore: Math.round(score * 100) / 100,
    isAmbiguous,
  };
}

/**
 * Hallucination Guard: verifies that an SKU candidate exists in the genuine database catalog.
 * Drops or flags unrecognized SKU codes returned by external AI models.
 */
export function filterHallucinatedCandidates(
  candidates: SkuCandidate[],
  validSkuCodes: Set<string>
): SkuCandidate[] {
  return candidates.filter((c) => validSkuCodes.has(c.skuCode));
}

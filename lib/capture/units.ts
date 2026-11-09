import { CaptureUnit } from "./types";
import { piecesToCases } from "../money/units";

const CASE_KEYWORDS = ["peti", "carton", "case", "dabba", "box", "ctn"];
const PIECE_KEYWORDS = ["packet", "pcs", "piece", "nag", "pkt", "pouch", "single", "unit"];

/**
 * Classifies unit keywords from raw customer text into standard wholesale units.
 */
export function classifyUnitWord(word?: string): { unit: CaptureUnit; matchedWord?: string } {
  if (!word) return { unit: "unknown" };
  const lower = word.toLowerCase().trim();

  for (const kw of CASE_KEYWORDS) {
    if (lower.includes(kw)) {
      return { unit: "case", matchedWord: kw };
    }
  }

  for (const kw of PIECE_KEYWORDS) {
    if (lower.includes(kw)) {
      return { unit: "piece", matchedWord: kw };
    }
  }

  return { unit: "unknown", matchedWord: word };
}

/**
 * Validates and converts piece quantities to whole cases.
 * Throws or blocks if piece quantity is not an exact case multiple.
 */
export function validatePieceConversion(
  pieces: number,
  piecesPerCase: number
): { success: boolean; cases: number; error?: string } {
  const result = piecesToCases(pieces, piecesPerCase);
  if (!result.exact) {
    const fraction = (pieces / piecesPerCase).toFixed(1);
    return {
      success: false,
      cases: result.cases,
      error: `Orders are in whole cases. ${pieces} pieces is ${fraction} cases (${result.cases} cases and ${result.remainder} loose pieces). Please enter whole cases.`,
    };
  }

  return {
    success: true,
    cases: result.cases,
  };
}

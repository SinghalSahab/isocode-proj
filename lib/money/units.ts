/**
 * Unit conversions and case pricing calculations.
 *
 * Implements Assumption A1 (A-PRICE-UNIT):
 * Dealer prices in the brief represent PER-PIECE wholesale prices.
 * Case price = piece price * pieces per case.
 */

export function calculateCasePricePaise(
  dealerPricePerPiecePaise: number,
  piecesPerCase: number
): number {
  if (piecesPerCase <= 0) {
    throw new Error(`piecesPerCase must be > 0, got ${piecesPerCase}`);
  }
  return dealerPricePerPiecePaise * piecesPerCase;
}

/**
 * Checks if a requested piece quantity is an exact whole-case multiple.
 */
export function piecesToCases(
  pieces: number,
  piecesPerCase: number
): { exact: boolean; cases: number; remainder: number } {
  if (piecesPerCase <= 0) {
    throw new Error(`piecesPerCase must be > 0, got ${piecesPerCase}`);
  }
  const cases = Math.floor(pieces / piecesPerCase);
  const remainder = pieces % piecesPerCase;
  return {
    exact: remainder === 0,
    cases,
    remainder,
  };
}


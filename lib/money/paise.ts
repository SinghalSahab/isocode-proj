/**
 * Money and currency helpers for integer paise handling.
 *
 * Rules:
 * 1. All monetary amounts are strictly integer paise.
 * 2. Floating-point math is never used for currency storage or state.
 * 3. Rounding uses deterministic half-up rounding (roundHalfUp) at line level.
 * 4. Display formatting adheres to the Indian numbering system (e.g. ₹1,23,456.78).
 */

/**
 * Converts decimal rupees (e.g. 8.10) to integer paise (810).
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Converts integer paise (810) to decimal rupees (8.10).
 */
export function paiseToRupees(paise: number | bigint): number {
  return Number(paise) / 100;
}

/**
 * Deterministic half-up rounding to nearest integer.
 * e.g. 10.5 -> 11, 10.4 -> 10, -10.5 -> -10
 */
export function roundHalfUp(value: number): number {
  return Math.sign(value) * Math.floor(Math.abs(value) + 0.5);
}

/**
 * Formats integer paise in Indian Rupee format with Indian digit grouping (lakhs/crores).
 * Example: 12345678 paise -> ₹1,23,456.78
 * Example: 77760 paise -> ₹777.60
 * Example: 0 paise -> ₹0.00
 */
export function formatINR(
  paise: number | bigint,
  options: { includeSymbol?: boolean; hidePaiseIfZero?: boolean } = {}
): string {
  const { includeSymbol = true, hidePaiseIfZero = false } = options;
  const numPaise = typeof paise === "bigint" ? Number(paise) : paise;
  const isNegative = numPaise < 0;
  const absPaise = Math.abs(numPaise);

  const rupees = Math.floor(absPaise / 100);
  const remainingPaise = absPaise % 100;

  // Format rupees part using Indian numbering (last 3 digits, then groups of 2)
  const rupeesStr = rupees.toString();
  let formattedRupees = "";

  if (rupeesStr.length <= 3) {
    formattedRupees = rupeesStr;
  } else {
    const last3 = rupeesStr.substring(rupeesStr.length - 3);
    const rest = rupeesStr.substring(0, rupeesStr.length - 3);
    // Split rest into groups of 2 from right to left
    const restGroups = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    formattedRupees = `${restGroups},${last3}`;
  }

  const paiseStr = remainingPaise.toString().padStart(2, "0");

  let result = "";
  if (hidePaiseIfZero && remainingPaise === 0) {
    result = formattedRupees;
  } else {
    result = `${formattedRupees}.${paiseStr}`;
  }

  const sign = isNegative ? "-" : "";
  const symbol = includeSymbol ? "₹" : "";

  return `${sign}${symbol}${result}`;
}

/**
 * Boundary converter: converts number or bigint to BigInt for Prisma aggregate columns.
 */
export function toBigIntPaise(paise: number | bigint): bigint {
  return typeof paise === "bigint" ? paise : BigInt(Math.trunc(paise));
}

/**
 * Boundary converter: safely converts BigInt to number for UI/calculation boundaries.
 */
export function fromBigIntPaise(paise: bigint): number {
  return Number(paise);
}


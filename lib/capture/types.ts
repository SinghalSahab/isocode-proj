export type CaptureUnit = "case" | "piece" | "unknown";
export type ConfidenceLevel = "High" | "Medium" | "Low";

export interface SkuCandidate {
  skuCode: string;
  score: number; // 0..1
}

export interface RawParsedLine {
  originalText: string;
  candidates: SkuCandidate[];
  quantity: number | null;
  unit: CaptureUnit;
  unitWord?: string;
  notes?: string;
}

export interface RawCaptureOutput {
  lines: RawParsedLine[];
}

export interface SkuCatalogContext {
  id: string;
  code: string;
  nameEn: string;
  nameHi: string;
  brand: string;
  piecesPerCase: number;
  stockCases: number;
  keywords: string[];
}

export interface CaptureContext {
  catalogue: SkuCatalogContext[];
  retailerAliases: Record<string, string>; // normalizedPhrase -> skuCode
  pastOrderSkuCodes: string[]; // SKU codes ordered recently by this retailer
}

export interface CaptureProvider {
  name: string;
  parse(rawText: string, context: CaptureContext): Promise<RawCaptureOutput>;
}

export interface DraftLine {
  id: string;
  originalText: string;
  matchedSku: {
    id: string;
    code: string;
    nameEn: string;
    nameHi: string;
    brand: string;
    piecesPerCase: number;
    casePricePaise: number;
    stockCases: number;
    imageKey: string;
  } | null;
  alternatives: Array<{
    id: string;
    code: string;
    nameEn: string;
    nameHi: string;
  }>;
  quantityCases: number;
  detectedUnit: CaptureUnit;
  unitWord?: string;
  needsUnitClarification: boolean;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  isAliasMatch: boolean;
  isAmbiguous: boolean;
  status: "READY" | "NEEDS_UNIT" | "UNMATCHED" | "OUT_OF_STOCK";
}

export interface CaptureDraft {
  captureId: string;
  providerUsed: string;
  isFallback: boolean;
  fallbackReason?: string;
  inputText: string;
  lines: DraftLine[];
  canConfirm: boolean;
  blockingReasons: string[];
}


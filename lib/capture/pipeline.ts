import { PrismaClient, Prisma } from "@prisma/client";
import { GeminiProvider } from "./gemini";
import { RuleBasedProvider } from "./rule-based";
import { sanitizeCaptureText } from "./sanitizer";
import { calibrateConfidence, filterHallucinatedCandidates } from "./confidence";
import { calculateCasePricePaise } from "../money/units";
import {
  CaptureContext,
  CaptureDraft,
  DraftLine,
  RawCaptureOutput,
  SkuCatalogContext,
} from "./types";

export interface RunCaptureInput {
  rawText: string;
  retailerId: string;
}

export async function processOrderCapture(
  prisma: PrismaClient,
  input: RunCaptureInput
): Promise<CaptureDraft> {
  const startTime = Date.now();
  const sanitizedText = sanitizeCaptureText(input.rawText);

  // 1. Fetch SKUs, retailer aliases, and past orders
  const [skus, aliases, pastOrders, retailer] = await Promise.all([
    prisma.sku.findMany({
      where: { active: true },
      include: {
        keywords: true,
        schemes: true,
      },
    }),
    prisma.retailerAlias.findMany({
      where: { retailerId: input.retailerId },
      include: { sku: true },
    }),
    prisma.order.findMany({
      where: { retailerId: input.retailerId },
      orderBy: { placedAt: "desc" },
      take: 5,
      include: {
        lines: {
          include: { sku: true },
        },
      },
    }),
    prisma.retailer.findUnique({
      where: { id: input.retailerId },
      include: { prices: true },
    }),
  ]);

  if (!retailer) {
    throw new Error(`RETAILER_NOT_FOUND: Retailer ${input.retailerId} not found.`);
  }

  // Build context
  const validSkuCodesSet = new Set(skus.map((s) => s.code));
  const skuByCodeMap = new Map(skus.map((s) => [s.code, s]));
  const priceOverrideMap = new Map(retailer.prices.map((p) => [p.skuId, p.pricePerPiecePaise]));

  const catalogContext: SkuCatalogContext[] = skus.map((s) => ({
    id: s.id,
    code: s.code,
    nameEn: s.nameEn,
    nameHi: s.nameHi,
    brand: s.brand,
    piecesPerCase: s.piecesPerCase,
    stockCases: s.stockCases,
    keywords: s.keywords.map((k) => k.keywordNormalised),
  }));

  const retailerAliasesMap: Record<string, string> = {};
  for (const a of aliases) {
    retailerAliasesMap[a.phraseNormalised.toLowerCase().trim()] = a.sku.code;
  }

  const pastOrderSkuCodesSet = new Set<string>();
  for (const order of pastOrders) {
    for (const line of order.lines) {
      pastOrderSkuCodesSet.add(line.sku.code);
    }
  }

  const context: CaptureContext = {
    catalogue: catalogContext,
    retailerAliases: retailerAliasesMap,
    pastOrderSkuCodes: Array.from(pastOrderSkuCodesSet),
  };

  // 2. Execute Capture Provider with Fallback
  let providerUsed = "Gemini";
  let isFallback = false;
  let fallbackReason: string | undefined = undefined;
  let rawOutput: RawCaptureOutput;

  try {
    const gemini = new GeminiProvider();
    rawOutput = await gemini.parse(sanitizedText, context);
  } catch (geminiError: unknown) {
    isFallback = true;
    providerUsed = "RuleBasedFallback";
    fallbackReason =
      geminiError instanceof Error ? geminiError.message : "Gemini provider unavailable";

    const ruleBased = new RuleBasedProvider();
    rawOutput = await ruleBased.parse(sanitizedText, context);
  }

  const latencyMs = Date.now() - startTime;

  // 3. Assemble and Validate Draft Lines
  const draftLines: DraftLine[] = [];
  const blockingReasons: string[] = [];

  for (let idx = 0; idx < rawOutput.lines.length; idx++) {
    const rawLine = rawOutput.lines[idx];
    const lineId = `draft-line-${idx + 1}`;

    // Hallucination Guard: drop unknown skuCodes
    const filteredCandidates = filterHallucinatedCandidates(
      rawLine.candidates,
      validSkuCodesSet
    );

    const topCandidate = filteredCandidates[0] || null;
    const isAliasMatch =
      topCandidate !== null &&
      retailerAliasesMap[rawLine.originalText.toLowerCase().trim()] === topCandidate.skuCode;

    // Calibrate confidence
    const { confidence, calibratedScore, isAmbiguous } = calibrateConfidence({
      rawScore: topCandidate?.score || 0,
      isAliasMatch,
      candidates: filteredCandidates,
    });

    const matchedSku = topCandidate ? skuByCodeMap.get(topCandidate.skuCode) || null : null;

    // Alternatives: next 2 candidates
    const alternatives = filteredCandidates.slice(1, 3).map((c) => {
      const altSku = skuByCodeMap.get(c.skuCode)!;
      return {
        id: altSku.id,
        code: altSku.code,
        nameEn: altSku.nameEn,
        nameHi: altSku.nameHi,
      };
    });

    // Unit clarification
    const needsUnitClarification =
      rawLine.unit === "piece" || rawLine.unit === "unknown" || rawLine.quantity === null;

    let lineStatus: DraftLine["status"] = "READY";

    if (!matchedSku) {
      lineStatus = "UNMATCHED";
      blockingReasons.push(`Line "${rawLine.originalText}" could not be matched to an item.`);
    } else if (matchedSku.stockCases <= 0) {
      lineStatus = "OUT_OF_STOCK";
      blockingReasons.push(`Item ${matchedSku.nameEn} is out of stock.`);
    } else if (needsUnitClarification) {
      lineStatus = "NEEDS_UNIT";
      blockingReasons.push(`Line "${rawLine.originalText}" requires unit clarification (case vs piece).`);
    }

    const priceOverride = matchedSku ? priceOverrideMap.get(matchedSku.id) : undefined;
    const piecePrice =
      priceOverride !== undefined
        ? priceOverride
        : matchedSku?.dealerPricePerPiecePaise || 0;
    const casePrice = matchedSku
      ? calculateCasePricePaise(piecePrice, matchedSku.piecesPerCase)
      : 0;

    draftLines.push({
      id: lineId,
      originalText: rawLine.originalText,
      matchedSku: matchedSku
        ? {
            id: matchedSku.id,
            code: matchedSku.code,
            nameEn: matchedSku.nameEn,
            nameHi: matchedSku.nameHi,
            brand: matchedSku.brand,
            piecesPerCase: matchedSku.piecesPerCase,
            casePricePaise: casePrice,
            stockCases: matchedSku.stockCases,
            imageKey: matchedSku.imageKey,
          }
        : null,
      alternatives,
      quantityCases: rawLine.quantity && rawLine.unit === "case" ? rawLine.quantity : 1,
      detectedUnit: rawLine.unit,
      unitWord: rawLine.unitWord,
      needsUnitClarification,
      confidence,
      confidenceScore: calibratedScore,
      isAliasMatch,
      isAmbiguous,
      status: lineStatus,
    });
  }

  const canConfirm =
    draftLines.length > 0 &&
    draftLines.every((l) => l.status === "READY" && l.matchedSku && l.matchedSku.stockCases > 0);

  // 4. Persist Capture Log
  const captureLog = await prisma.captureLog.create({
    data: {
      retailerId: input.retailerId,
      inputText: sanitizedText,
      provider: providerUsed,
      model: isFallback ? "rule-based-v1" : process.env.GEMINI_MODEL || "gemini-1.5-flash",
      latencyMs,
      fallbackReason: fallbackReason || null,
      draftJson: {
        lines: draftLines,
      } as unknown as Prisma.InputJsonValue,
      totalLines: draftLines.length,
    },
  });

  return {
    captureId: captureLog.id,
    providerUsed,
    isFallback,
    fallbackReason,
    inputText: sanitizedText,
    lines: draftLines,
    canConfirm,
    blockingReasons,
  };
}

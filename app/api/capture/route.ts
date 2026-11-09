import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { processOrderCapture } from "@/lib/capture/pipeline";
import { checkCaptureRateLimit } from "@/lib/capture/rate-limit";

const captureRequestSchema = z.object({
  text: z.string().min(1).max(1000),
});

export async function POST(request: Request) {
  try {
    const session = await requireUser("retailer");
    const retailerId = session.retailerId;
    if (!retailerId) {
      return NextResponse.json({ error: "NO_RETAILER_PROFILE" }, { status: 403 });
    }

    // Rate limit check
    const rateLimit = checkCaptureRateLimit(retailerId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "RATE_LIMITED",
          message: "Too many AI capture requests. Please wait a moment before sending another message.",
          resetSeconds: Math.ceil(rateLimit.resetMs / 1000),
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = captureRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_CAPTURE_INPUT", message: "Message must be between 1 and 1000 characters." },
        { status: 400 }
      );
    }

    const draft = await processOrderCapture(prisma, {
      rawText: parsed.data.text,
      retailerId,
    });

    return NextResponse.json({
      success: true,
      draft,
    });
  } catch (error: unknown) {
    console.error("Error in capture route:", error);
    const msg = error instanceof Error ? error.message : "Capture processing failed.";
    return NextResponse.json(
      { error: "CAPTURE_ERROR", message: msg },
      { status: 500 }
    );
  }
}

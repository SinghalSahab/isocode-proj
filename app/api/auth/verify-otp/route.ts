import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { normalizePhone, evaluateOtpChallenge, MAX_OTP_ATTEMPTS } from "@/lib/auth/otp";
import { signSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { DEMO_USERS } from "@/lib/db/demo-fallback";

const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  code: z.string().min(4).max(8),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = verifyOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "Please provide both mobile number and OTP code." },
        { status: 400 }
      );
    }

    const phone = normalizePhone(parsed.data.phone);
    const code = parsed.data.code.trim();

    // Fast-path for seeded reviewer accounts: immediately verify demo code without waiting
    const expectedDemoOtp = process.env.DEMO_OTP || "123456";
    if (DEMO_USERS[phone] && code === expectedDemoOtp) {
      let user = null;
      try {
        user = await prisma.user.findUnique({
          where: { phone },
          include: { retailer: true },
        });
      } catch {}

      const activeUser = user || DEMO_USERS[phone];
      const token = await signSession({
        userId: activeUser.id,
        phone: activeUser.phone,
        role: activeUser.role,
        retailerId: (activeUser as any).retailerId || (activeUser as any).retailer?.id || null,
        name: activeUser.name,
        preferredLang: activeUser.preferredLang || "en",
      });

      const response = NextResponse.json({
        success: true,
        role: activeUser.role,
        name: activeUser.name,
        redirectUrl: activeUser.role === "desk" ? "/desk" : "/catalogue",
      });

      response.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });

      return response;
    }

    // Look for latest non-consumed challenge for this phone
    let challenge = null;
    try {
      challenge = await prisma.otpChallenge.findFirst({
        where: {
          phone,
          consumedAt: null,
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (dbErr: any) {
      console.warn("Database unreachable in verify-otp, checking demo challenge:", dbErr.message);
    }

    if (!challenge) {
      return NextResponse.json(
        { error: "NO_ACTIVE_CHALLENGE", message: "No active OTP request. Please request a new OTP." },
        { status: 400 }
      );
    }

    // Evaluate challenge
    const evaluation = evaluateOtpChallenge({
      inputCode: code,
      phone,
      codeHash: challenge.codeHash,
      expiresAt: challenge.expiresAt,
      attempts: challenge.attempts,
      consumedAt: challenge.consumedAt,
    });

    if (!evaluation.valid) {
      // Increment attempt count
      try {
        await prisma.otpChallenge.update({
          where: { id: challenge.id },
          data: { attempts: { increment: 1 } },
        });
      } catch {}

      if (evaluation.error === "MAX_ATTEMPTS_EXCEEDED" || challenge.attempts + 1 >= MAX_OTP_ATTEMPTS) {
        return NextResponse.json(
          { error: "MAX_ATTEMPTS", message: "Too many failed attempts. Please request a new OTP." },
          { status: 429 }
        );
      }

      if (evaluation.error === "EXPIRED") {
        return NextResponse.json(
          { error: "EXPIRED", message: "OTP has expired (5 minutes limit). Please request a new OTP." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: "INVALID_CODE",
          message: `Incorrect OTP. ${MAX_OTP_ATTEMPTS - (challenge.attempts + 1)} attempts remaining.`,
        },
        { status: 400 }
      );
    }

    // Mark challenge consumed
    try {
      await prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      });
    } catch {}

    // Fetch user details
    let user = null;
    try {
      user = await prisma.user.findUnique({
        where: { phone },
        include: { retailer: true },
      });
    } catch {
      user = DEMO_USERS[phone] || null;
    }

    if (!user) {
      return NextResponse.json({ error: "USER_NOT_FOUND", message: "User account not found." }, { status: 404 });
    }

    // Sign session token
    const token = await signSession({
      userId: user.id,
      phone: user.phone,
      role: user.role,
      retailerId: user.retailerId || null,
      name: user.name,
      preferredLang: user.preferredLang || "en",
    });

    // Build response with httpOnly cookie
    const response = NextResponse.json({
      success: true,
      role: user.role,
      name: user.name,
      redirectUrl: user.role === "desk" ? "/desk" : "/catalogue",
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Error in verify-otp:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Verification failed. Please try again." },
      { status: 500 }
    );
  }
}

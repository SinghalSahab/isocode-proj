import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { normalizePhone, isValidPhone, generateOtp, hashOtpCode, OTP_EXPIRY_MINUTES } from "@/lib/auth/otp";
import { DEMO_USERS } from "@/lib/db/demo-fallback";

const sendOtpSchema = z.object({
  phone: z.string().min(10).max(15),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = sendOtpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_PHONE", message: "Please enter a valid 10-digit mobile number." },
        { status: 400 }
      );
    }

    const phone = normalizePhone(parsed.data.phone);
    if (!isValidPhone(phone)) {
      return NextResponse.json(
        { error: "INVALID_PHONE_FORMAT", message: "Mobile number must be 10 digits starting with 6-9." },
        { status: 400 }
      );
    }

    // Check if user exists in database, with demo-fallback if DB is offline
    let user = null;
    let dbOffline = false;

    try {
      user = await prisma.user.findUnique({
        where: { phone },
        include: { retailer: true },
      });
    } catch (dbErr: any) {
      console.warn("Database unreachable in send-otp, checking demo accounts:", dbErr.message);
      dbOffline = true;
      user = DEMO_USERS[phone] || null;
    }

    if (!user) {
      return NextResponse.json(
        {
          error: "USER_NOT_FOUND",
          message: "Number not registered. Please contact Company A order desk or use a demo account.",
        },
        { status: 404 }
      );
    }

    // Generate and hash OTP
    const code = generateOtp();
    const codeHash = hashOtpCode(phone, code);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    if (!dbOffline) {
      try {
        await prisma.otpChallenge.create({
          data: {
            phone,
            codeHash,
            expiresAt,
            attempts: 0,
          },
        });
      } catch (err: any) {
        console.warn("Could not save OTP challenge to DB, proceeding with demo OTP:", err.message);
      }
    }

    // In demo mode, we return demoOtp so the UI banner is confirmed
    return NextResponse.json({
      success: true,
      message: "OTP sent to your mobile.",
      demoOtp: code,
    });
  } catch (error) {
    console.error("Error in send-otp:", error);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "Unable to send OTP. Please try again." },
      { status: 500 }
    );
  }
}


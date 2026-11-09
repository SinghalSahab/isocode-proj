/**
 * JWT Session management using `jose`.
 * Stores signed, encrypted-integrity session claims in an httpOnly cookie.
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";

export const SESSION_COOKIE_NAME = "fmcg_session";

export interface SessionPayload {
  userId: string;
  phone: string;
  role: Role;
  retailerId: string | null;
  name: string;
  preferredLang: string;
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET || "demo-insecure-secret-key-change-in-production-min-32-chars-long";
  return new TextEncoder().encode(secret);
}

/**
 * Signs a new session JWT with a 7-day expiration.
 */
export async function signSession(payload: SessionPayload): Promise<string> {
  const secret = getJwtSecret();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

/**
 * Verifies a session JWT and returns the parsed payload.
 * Throws if expired, tampered, or invalid.
 */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: payload.userId as string,
      phone: payload.phone as string,
      role: payload.role as Role,
      retailerId: (payload.retailerId as string) || null,
      name: payload.name as string,
      preferredLang: (payload.preferredLang as string) || "en",
    };
  } catch {
    return null;
  }
}

/**
 * Retrieves the current session from incoming request cookies (Server Components / Actions).
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

/**
 * Sets the session cookie on the response.
 */
export function setSessionCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

/**
 * Clears the session cookie on logout.
 */
export function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Access control guard: enforces that a user is authenticated and matches required roles.
 */
export async function requireUser(
  allowedRoles?: Role | Role[]
): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  if (allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(session.role)) {
      throw new Error("FORBIDDEN_ROLE");
    }
  }

  return session;
}


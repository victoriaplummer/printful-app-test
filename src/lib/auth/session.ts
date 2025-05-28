import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "session_id";
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export interface SessionData {
  sessionId: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Generate a new session ID
 */
export function generateSessionId(): string {
  return crypto.randomUUID();
}

/**
 * Create a new session
 */
export function createSession(): SessionData {
  const now = Date.now();
  return {
    sessionId: generateSessionId(),
    createdAt: now,
    expiresAt: now + SESSION_DURATION,
  };
}

/**
 * Get session from cookies (server-side)
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    const sessionData: SessionData = JSON.parse(sessionCookie.value);

    // Check if session is expired
    if (sessionData.expiresAt < Date.now()) {
      return null;
    }

    return sessionData;
  } catch (error) {
    console.error("Error parsing session cookie:", error);
    return null;
  }
}

/**
 * Get session from request (middleware)
 */
export function getSessionFromRequest(
  request: NextRequest
): SessionData | null {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    const sessionData: SessionData = JSON.parse(sessionCookie.value);

    // Check if session is expired
    if (sessionData.expiresAt < Date.now()) {
      return null;
    }

    return sessionData;
  } catch (error) {
    console.error("Error parsing session cookie:", error);
    return null;
  }
}

/**
 * Set session cookie
 */
export function setSessionCookie(
  response: NextResponse,
  session: SessionData
): void {
  response.cookies.set(SESSION_COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION / 1000, // Convert to seconds
    path: "/",
  });
}

/**
 * Get or create session from request
 */
export async function getOrCreateSession(request: NextRequest): Promise<{
  session: SessionData;
  response?: NextResponse;
}> {
  const existingSession = getSessionFromRequest(request);

  if (existingSession) {
    return { session: existingSession };
  }

  // Create new session
  const newSession = createSession();
  const response = NextResponse.next();
  setSessionCookie(response, newSession);

  return { session: newSession, response };
}

/**
 * Ensure session exists (for middleware)
 */
export async function ensureSession(request: NextRequest): Promise<{
  sessionId: string;
  response?: NextResponse;
}> {
  const existingSession = getSessionFromRequest(request);

  if (existingSession) {
    return { sessionId: existingSession.sessionId };
  }

  // Create new session
  const newSession = createSession();
  const response = NextResponse.next();
  setSessionCookie(response, newSession);

  return { sessionId: newSession.sessionId, response };
}

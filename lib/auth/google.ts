import "server-only";
import { SignJWT, jwtVerify, createRemoteJWKSet } from "jose";
import { env } from "@/lib/env";
import { PUBLIC_REGISTER_ROLES } from "@/lib/validators/auth";

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

const jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

/** Short-lived, distinct from session JWTs — carries CSRF nonce + intended registration role only. */
const stateSecretKey = new TextEncoder().encode(env.SESSION_SECRET);
const STATE_MAX_AGE_SECONDS = 10 * 60;

export type GoogleRole = (typeof PUBLIC_REGISTER_ROLES)[number];

export interface GoogleOAuthState {
  nonce: string;
  /** Absent when the entry point had no intent signal (e.g. the login page's Google button) — the callback defers account creation to /welcome in that case instead of guessing. */
  role?: GoogleRole;
}

export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

/** The buttons hide themselves when this is false — see login/register pages. */
export function isGoogleAuthConfigured() {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

function redirectUri() {
  return `${env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;
}

export async function createGoogleOAuthState(role?: GoogleRole) {
  const nonce = crypto.randomUUID();
  const token = await new SignJWT({ nonce, role, purpose: "google_oauth_state" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + STATE_MAX_AGE_SECONDS)
    .sign(stateSecretKey);
  return token;
}

export async function verifyGoogleOAuthState(token: string): Promise<GoogleOAuthState | null> {
  try {
    const { payload } = await jwtVerify(token, stateSecretKey);
    if (payload.purpose !== "google_oauth_state") return null;
    if (typeof payload.nonce !== "string") return null;
    if (payload.role !== undefined) {
      if (typeof payload.role !== "string" || !PUBLIC_REGISTER_ROLES.includes(payload.role as GoogleRole)) return null;
      return { nonce: payload.nonce, role: payload.role as GoogleRole };
    }
    return { nonce: payload.nonce };
  } catch {
    return null;
  }
}

/**
 * Carries a verified Google profile across the redirect to /welcome for a
 * brand-new signup with no intent signal — nothing is written to the DB
 * until the user picks Shop/Sell there. Same trust model and expiry window
 * as the OAuth state token above (it's a direct continuation of the same
 * round trip), just a distinct `purpose` claim.
 */
export async function createPendingGoogleSignupToken(profile: GoogleProfile) {
  const token = await new SignJWT({ ...profile, purpose: "google_pending_signup" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + STATE_MAX_AGE_SECONDS)
    .sign(stateSecretKey);
  return token;
}

export async function verifyPendingGoogleSignupToken(token: string): Promise<GoogleProfile | null> {
  try {
    const { payload } = await jwtVerify(token, stateSecretKey);
    if (payload.purpose !== "google_pending_signup") return null;
    if (typeof payload.googleId !== "string" || typeof payload.email !== "string") return null;
    if (typeof payload.firstName !== "string" || typeof payload.lastName !== "string") return null;
    if (typeof payload.emailVerified !== "boolean") return null;
    return {
      googleId: payload.googleId,
      email: payload.email,
      emailVerified: payload.emailVerified,
      firstName: payload.firstName,
      lastName: payload.lastName,
      avatarUrl: typeof payload.avatarUrl === "string" ? payload.avatarUrl : undefined,
    };
  } catch {
    return null;
  }
}

export function buildGoogleAuthUrl(state: string) {
  if (!env.GOOGLE_CLIENT_ID) throw new Error("GOOGLE_CLIENT_ID is not configured");

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });

  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

interface GoogleTokenResponse {
  id_token: string;
  access_token: string;
  expires_in: number;
  token_type: string;
}

/** Exchanges an authorization code for tokens. Throws on any non-2xx response. */
export async function exchangeGoogleCode(code: string): Promise<GoogleTokenResponse> {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth is not configured");
  }

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

/** Verifies signature, issuer, audience and expiry against Google's live JWKS, then extracts profile claims. */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  if (!env.GOOGLE_CLIENT_ID) throw new Error("GOOGLE_CLIENT_ID is not configured");

  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: GOOGLE_ISSUERS,
    audience: env.GOOGLE_CLIENT_ID,
  });

  if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
    throw new Error("Google ID token is missing required claims");
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified === true,
    firstName: typeof payload.given_name === "string" ? payload.given_name : "",
    lastName: typeof payload.family_name === "string" ? payload.family_name : "",
    avatarUrl: typeof payload.picture === "string" ? payload.picture : undefined,
  };
}

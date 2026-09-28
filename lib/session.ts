/**
 * Admin session token (signed JWT in an httpOnly cookie).
 * Edge/Node-safe (only uses `jose`), so the proxy can import it too.
 */
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "tf_admin";
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

function key(): Uint8Array | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

export async function signSession(email: string): Promise<string> {
  const k = key();
  if (!k) throw new Error("SESSION_SECRET must be set (32+ characters)");
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .setAudience("timber-flame-admin")
    .sign(k);
}

export async function verifySession(token: string | undefined): Promise<{ email: string } | null> {
  const k = key();
  if (!token || !k) return null;
  try {
    const { payload } = await jwtVerify(token, k, { algorithms: ["HS256"], audience: "timber-flame-admin" });
    if (payload.role !== "admin" || typeof payload.sub !== "string") return null;
    return { email: payload.sub };
  } catch {
    return null;
  }
}

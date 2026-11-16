import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

const COOKIE = "acc_session";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(value);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());

  try {
    const jar = await cookies();
    jar.set(COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  } catch {
    // Graceful fallback when invoked outside a Next.js request store (e.g. CLI/tests)
  }
}

export async function clearSession() {
  try {
    const jar = await cookies();
    jar.delete(COOKIE);
    jar.set(COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
  } catch {
    // Graceful fallback when invoked outside a Next.js request store
  }
}

export async function getSession(): Promise<SessionUser | null> {
  let token: string | undefined;
  try {
    const jar = await cookies();
    token = jar.get(COOKIE)?.value;
  } catch {
    return null;
  }
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: String(payload.id),
      name: String(payload.name),
      email: String(payload.email),
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    return null;
  }
  return session;
}

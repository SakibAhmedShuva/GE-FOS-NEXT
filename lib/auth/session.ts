import { cookies } from "next/headers";
import { cache } from "react";
import { jwtVerify, SignJWT } from "jose";
import { prisma } from "@/lib/db/prisma";

export const SESSION_COOKIE_NAME = "fos_session";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "USER";
  isActive: boolean;
  signatureStorageKey?: string | null;
};

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 24) {
    throw new Error("SESSION_SECRET must be set to a long random value");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSessionSecret());
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) return null;

  try {
    const verified = await jwtVerify(sessionToken, getSessionSecret());
    const userId = verified.payload.sub;
    if (!userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, isActive: true, signatureStorageKey: true },
    });

    if (!user || !user.isActive) return null;
    return user;
  } catch {
    return null;
  }
});

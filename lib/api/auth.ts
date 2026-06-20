import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";

export async function getApiUser() {
  const user = await getSessionUser();
  if (!user || !user.isActive) {
    return { user: null, response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) };
  }
  return { user, response: null };
}

export async function getApiAdmin() {
  const auth = await getApiUser();
  if (auth.response) return auth;
  if (auth.user.role !== "ADMIN") {
    return { user: null, response: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  }
  return auth;
}

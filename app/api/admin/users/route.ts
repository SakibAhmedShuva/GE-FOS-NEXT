import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getApiAdmin } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

const createSchema = z.object({ name: z.string().min(1), email: z.string().email(), password: z.string().min(8), role: z.enum(["ADMIN", "USER"]).default("USER"), signatureStorageKey: z.string().trim().optional().nullable() });

export async function GET() {
  const auth = await getApiAdmin();
  if (auth.response) return auth.response;
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 200, select: { id: true, name: true, email: true, role: true, isActive: true, passwordResetRequired: true, signatureStorageKey: true, lastLoginAt: true, createdAt: true } });
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const auth = await getApiAdmin();
  if (auth.response) return auth.response;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid user payload" }, { status: 400 });
  const hash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({ data: { name: parsed.data.name, email: parsed.data.email.toLowerCase(), passwordHash: hash, role: parsed.data.role, isActive: true, passwordResetRequired: true, signatureStorageKey: parsed.data.signatureStorageKey || null } });
  await prisma.activityLog.create({ data: { actorUserId: auth.user.id, actorNameSnapshot: auth.user.name, action: "admin_user_created", entityType: "user", entityId: user.id, metadata: { email: user.email, role: user.role } } });
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive, signatureStorageKey: user.signatureStorageKey } }, { status: 201 });
}

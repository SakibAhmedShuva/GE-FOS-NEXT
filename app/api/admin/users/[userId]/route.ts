import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getApiAdmin } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

const updateSchema = z.object({ name: z.string().min(1).optional(), role: z.enum(["ADMIN", "USER"]).optional(), isActive: z.boolean().optional(), password: z.string().min(8).optional(), signatureStorageKey: z.string().trim().optional().nullable() });

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await getApiAdmin();
  if (auth.response) return auth.response;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid user update payload" }, { status: 400 });
  const { userId } = await params;
  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.role !== undefined) data.role = parsed.data.role;
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;
  if (parsed.data.password !== undefined) { data.passwordHash = await bcrypt.hash(parsed.data.password, 12); data.passwordResetRequired = true; }
  if (parsed.data.signatureStorageKey !== undefined) data.signatureStorageKey = parsed.data.signatureStorageKey || null;
  const user = await prisma.user.update({ where: { id: userId }, data: data as never });
  await prisma.activityLog.create({ data: { actorUserId: auth.user.id, actorNameSnapshot: auth.user.name, action: "admin_user_updated", entityType: "user", entityId: user.id, metadata: { email: user.email, fields: Object.keys(data) } } });
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive, signatureStorageKey: user.signatureStorageKey } });
}

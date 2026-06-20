import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const auth = await getApiUser();
  if (auth.response) return auth.response;
  const users = await prisma.user.findMany({ where: { isActive: true, id: { not: auth.user.id } }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true, role: true, presence: { select: { lastSeenAt: true } }, receivedMessages: { where: { senderUserId: auth.user.id, readAt: null }, select: { id: true } } } });
  const now = Date.now();
  return NextResponse.json({ users: users.map((user: any) => ({ id: user.id, name: user.name, email: user.email, role: user.role, online: user.presence?.lastSeenAt ? now - new Date(user.presence.lastSeenAt).getTime() < 2 * 60 * 1000 : false, lastSeenAt: user.presence?.lastSeenAt || null, unreadCount: user.receivedMessages?.length || 0 })) });
}

import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const auth = await getApiUser();
  if (auth.response) return auth.response;
  const user = auth.user;
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, type: true, title: true, messageHtml: true, isRead: true, actionUrl: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId: user.id, deletedAt: null, isRead: false } }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

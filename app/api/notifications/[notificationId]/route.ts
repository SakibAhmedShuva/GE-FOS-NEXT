import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";

export async function DELETE(_request: Request, { params }: { params: Promise<{ notificationId: string }> }) {
  const auth = await getApiUser();
  if (auth.response) return auth.response;
  const user = auth.user;
  const { notificationId } = await params;

  const notification = await prisma.notification.findFirst({ where: { id: notificationId, userId: user.id, deletedAt: null } });
  if (!notification) return NextResponse.json({ error: "Notification not found" }, { status: 404 });

  await prisma.notification.update({ where: { id: notificationId }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}

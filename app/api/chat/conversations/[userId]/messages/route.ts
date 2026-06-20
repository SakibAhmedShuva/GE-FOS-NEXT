import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";
import { sanitizeLegacyRichText } from "@/lib/validators/sanitize-html";

const schema = z.object({ body: z.string().min(1).max(5000), attachmentIds: z.array(z.string()).default([]) });

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await getApiUser(); if (auth.response) return auth.response; const { userId } = await params; const { searchParams } = new URL(request.url); const take = Math.min(Number(searchParams.get("take") || 50), 100);
  const other = await prisma.user.findFirst({ where: { id: userId, isActive: true }, select: { id: true, name: true, email: true } }); if (!other) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const messages = await prisma.chatMessage.findMany({ where: { OR: [{ senderUserId: auth.user.id, recipientUserId: userId }, { senderUserId: userId, recipientUserId: auth.user.id }] }, orderBy: { createdAt: "desc" }, take, include: { sender: { select: { id: true, name: true, email: true } }, attachments: true } });
  await prisma.chatMessage.updateMany({ where: { senderUserId: userId, recipientUserId: auth.user.id, readAt: null }, data: { readAt: new Date() } });
  return NextResponse.json({ messages: messages.reverse() });
}

export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await getApiUser(); if (auth.response) return auth.response; const { userId } = await params; const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Invalid message payload" }, { status: 400 });
  const other = await prisma.user.findFirst({ where: { id: userId, isActive: true }, select: { id: true } }); if (!other) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const message = await prisma.chatMessage.create({ data: { senderUserId: auth.user.id, recipientUserId: userId, message: { body: sanitizeLegacyRichText(parsed.data.body) } as never }, include: { sender: { select: { id: true, name: true, email: true } }, attachments: true } });
  if (parsed.data.attachmentIds.length) await prisma.chatAttachment.updateMany({ where: { id: { in: parsed.data.attachmentIds }, uploadedByUserId: auth.user.id, messageId: null }, data: { messageId: message.id } });
  await prisma.notification.create({ data: { userId, type: "CHAT", title: "New chat message", messageHtml: `${auth.user.name}: ${sanitizeLegacyRichText(parsed.data.body).slice(0, 140)}`, actionUrl: "/chat", metadata: { messageId: message.id, senderUserId: auth.user.id } } });
  return NextResponse.json({ message }, { status: 201 });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiAdmin } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";
import { sanitizeLegacyRichText } from "@/lib/validators/sanitize-html";

const schema = z.object({ recipientEmail: z.string().email().optional().nullable(), title: z.string().min(1), messageHtml: z.string().min(1) });

export async function POST(request: Request) {
  const auth = await getApiAdmin();
  if (auth.response) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid message payload" }, { status: 400 });
  const where = parsed.data.recipientEmail ? { email: parsed.data.recipientEmail.toLowerCase(), isActive: true } : { isActive: true };
  const users = await prisma.user.findMany({ where, select: { id: true, email: true } });
  if (!users.length) return NextResponse.json({ error: "No active recipients found" }, { status: 404 });
  const messageHtml = sanitizeLegacyRichText(parsed.data.messageHtml);
  await prisma.notification.createMany({ data: users.map((user: { id: string }) => ({ userId: user.id, type: "ADMIN_MESSAGE" as const, title: parsed.data.title, messageHtml, metadata: { sentBy: auth.user.id } })) });
  await prisma.activityLog.create({ data: { actorUserId: auth.user.id, actorNameSnapshot: auth.user.name, action: "admin_message_sent", entityType: "notification", metadata: { recipientCount: users.length, recipientEmail: parsed.data.recipientEmail || null, title: parsed.data.title } } });
  return NextResponse.json({ sentCount: users.length });
}

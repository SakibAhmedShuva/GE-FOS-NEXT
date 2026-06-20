import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api/auth";
import { prisma } from "@/lib/db/prisma";
export async function POST() { const auth = await getApiUser(); if (auth.response) return auth.response; await prisma.userPresence.upsert({ where: { userId: auth.user.id }, update: { lastSeenAt: new Date() }, create: { userId: auth.user.id, lastSeenAt: new Date() } }); return NextResponse.json({ ok: true }); }

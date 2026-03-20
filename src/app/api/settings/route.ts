import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { geminiApiKeyEncrypted: true },
  });

  if (!user?.geminiApiKeyEncrypted) {
    return NextResponse.json({ hasKey: false, maskedKey: null });
  }

  try {
    const key = decrypt(user.geminiApiKeyEncrypted);
    const masked = key.slice(0, 8) + "..." + key.slice(-4);
    return NextResponse.json({ hasKey: true, maskedKey: masked });
  } catch {
    return NextResponse.json({ hasKey: false, maskedKey: null });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { apiKey } = body;

  if (!apiKey?.trim()) {
    return NextResponse.json({ error: "API key is required" }, { status: 400 });
  }

  const encrypted = encrypt(apiKey.trim());

  await prisma.user.update({
    where: { id: session.user.id },
    data: { geminiApiKeyEncrypted: encrypted },
  });

  return NextResponse.json({ ok: true });
}

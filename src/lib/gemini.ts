import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

export async function getGenAIForUser(userId: string): Promise<GoogleGenAI | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { geminiApiKeyEncrypted: true },
  });

  if (!user?.geminiApiKeyEncrypted) return null;

  try {
    const apiKey = decrypt(user.geminiApiKeyEncrypted);
    return new GoogleGenAI({ apiKey });
  } catch {
    return null;
  }
}

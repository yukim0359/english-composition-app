import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      preferredEasy: true,
      preferredMedium: true,
      preferredHard: true,
      preferredTopicIds: true,
      preferredCustomTopic: true,
    },
  });

  return NextResponse.json({
    easy: user?.preferredEasy ?? 2,
    medium: user?.preferredMedium ?? 3,
    hard: user?.preferredHard ?? 2,
    selectedTopicIds: user?.preferredTopicIds ?? [],
    customTopic: user?.preferredCustomTopic ?? "",
  });
}

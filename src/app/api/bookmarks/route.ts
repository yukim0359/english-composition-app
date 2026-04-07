import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { submissionId } = body;

  if (!submissionId) {
    return NextResponse.json(
      { error: "submissionId is required" },
      { status: 400 },
    );
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { userId: true, bookmarked: true },
  });

  if (!submission || submission.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.submission.update({
    where: { id: submissionId },
    data: { bookmarked: !submission.bookmarked },
    select: { id: true, bookmarked: true },
  });

  return NextResponse.json(updated);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookmarks = await prisma.submission.findMany({
    where: { userId: session.user.id, bookmarked: true },
    orderBy: { createdAt: "desc" },
    include: {
      exercise: { select: { japaneseText: true, difficulty: true } },
      dailySet: { select: { date: true } },
    },
  });

  return NextResponse.json(bookmarks);
}

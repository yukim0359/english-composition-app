import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const submissionId = searchParams.get("submissionId");

  if (submissionId) {
    const notes = await prisma.vocabularyNote.findMany({
      where: { submissionId, userId: session.user.id },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(notes);
  }

  const notes = await prisma.vocabularyNote.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      submission: {
        select: {
          exercise: { select: { japaneseText: true } },
          dailySet: { select: { date: true } },
        },
      },
    },
  });
  return NextResponse.json(notes);
}

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

  const submission = await prisma.submission.findFirst({
    where: { id: submissionId, userId: session.user.id },
  });
  if (!submission) {
    return NextResponse.json(
      { error: "Submission not found" },
      { status: 404 },
    );
  }

  const entries: { english: string; japanese: string }[] = Array.isArray(
    body.entries,
  )
    ? body.entries
    : body.english?.trim()
      ? [{ english: body.english, japanese: body.japanese ?? "" }]
      : [];

  const valid = entries.filter((e) => e.english?.trim());
  if (valid.length === 0) {
    return NextResponse.json(
      { error: "At least one entry with english is required" },
      { status: 400 },
    );
  }

  const notes = await prisma.$transaction(
    valid.map((e) =>
      prisma.vocabularyNote.create({
        data: {
          english: e.english.trim(),
          japanese: e.japanese?.trim() ?? "",
          submissionId,
          userId: session.user.id,
        },
      }),
    ),
  );

  return NextResponse.json(notes);
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await prisma.vocabularyNote.deleteMany({
    where: { id, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}

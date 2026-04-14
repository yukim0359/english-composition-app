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
  const exerciseId = searchParams.get("exerciseId");

  if (exerciseId) {
    const notes = await prisma.vocabularyNote.findMany({
      where: { exerciseId, userId: session.user.id },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(notes);
  }

  const notes = await prisma.vocabularyNote.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      exercise: {
        select: {
          japaneseText: true,
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
  const { exerciseId } = body;

  if (!exerciseId) {
    return NextResponse.json(
      { error: "exerciseId is required" },
      { status: 400 },
    );
  }

  const exercise = await prisma.exercise.findFirst({
    where: { id: exerciseId, dailySet: { userId: session.user.id } },
  });
  if (!exercise) {
    return NextResponse.json(
      { error: "Exercise not found" },
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
          exerciseId,
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

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 10;

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const mode = searchParams.get("mode");
  const maxScoreParam = searchParams.get("maxScore");
  const before = searchParams.get("before");
  const limit = Math.min(
    parseInt(searchParams.get("limit") ?? String(PAGE_SIZE)),
    50,
  );

  if (date) {
    const dailySet = await prisma.dailySet.findUnique({
      where: { userId_date: { userId, date } },
      include: {
        exercises: {
          include: {
            submissions: {
              where: { userId },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });
    return NextResponse.json(dailySet);
  }

  // Lightweight all-time stats for calendar and streak
  if (mode === "stats") {
    const statsData = await prisma.dailySet.findMany({
      where: { userId },
      select: {
        date: true,
        exercises: {
          select: {
            submissions: {
              where: { userId },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    const studiedDates = statsData
      .map((ds) => ({
        date: ds.date,
        count: ds.exercises.filter((ex) => ex.submissions.length > 0).length,
      }))
      .filter((d) => d.count > 0);

    return NextResponse.json({ studiedDates });
  }

  // Paginated list
  const maxScore = maxScoreParam !== null ? parseInt(maxScoreParam) : null;

  const where = {
    userId,
    ...(before ? { date: { lt: before } } : {}),
    ...(maxScore !== null
      ? {
          exercises: {
            some: {
              submissions: {
                some: { userId, score: { lte: maxScore } },
              },
            },
          },
        }
      : {}),
  };

  const dailySets = await prisma.dailySet.findMany({
    where,
    orderBy: { date: "desc" },
    take: limit + 1,
    include: {
      exercises: {
        include: {
          submissions: {
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  const hasMore = dailySets.length > limit;
  const items = hasMore ? dailySets.slice(0, limit) : dailySets;

  const filteredItems =
    maxScore !== null
      ? items.map((ds) => ({
          ...ds,
          exercises: ds.exercises.filter(
            (ex) =>
              ex.submissions.length > 0 && ex.submissions[0].score <= maxScore,
          ),
        }))
      : items;

  const nextCursor = hasMore ? items[items.length - 1].date : null;

  return NextResponse.json({ items: filteredItems, nextCursor, hasMore });
}

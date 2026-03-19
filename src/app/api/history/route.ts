import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const scoreFilter = searchParams.get("maxScore");

  if (date) {
    const dailySet = await prisma.dailySet.findUnique({
      where: {
        userId_date: { userId, date },
      },
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

  const dailySets = await prisma.dailySet.findMany({
    where: { userId },
    orderBy: { date: "desc" },
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

  if (scoreFilter) {
    const maxScore = parseInt(scoreFilter);
    const filtered = dailySets
      .map((ds: (typeof dailySets)[number]) => ({
        ...ds,
        exercises: ds.exercises.filter(
          (ex: (typeof ds.exercises)[number]) =>
            ex.submissions.length > 0 && ex.submissions[0].score <= maxScore,
        ),
      }))
      .filter((ds: { exercises: unknown[] }) => ds.exercises.length > 0);
    return NextResponse.json(filtered);
  }

  return NextResponse.json(dailySets);
}

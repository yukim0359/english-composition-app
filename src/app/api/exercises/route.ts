import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGenAIForUser } from "@/lib/gemini";
import { withRetry } from "@/lib/retry";

function getTodayString() {
  // JST-based date string (YYYY-MM-DD) so the "daily" boundary matches Japan time.
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function buildPrompt(config: {
  easy: number;
  medium: number;
  hard: number;
  topics: string[];
}) {
  const total = config.easy + config.medium + config.hard;
  const topicInstruction =
    config.topics.length > 0
      ? `- トピック: ${config.topics.join("、")}（これらの場面で実際に使いそうな文にすること）`
      : "- トピック: 日常生活で実際に使う場面を想定した、自然で実用的な文にすること";

  return `あなたは英語学習の教師です。日本語から英語への翻訳練習問題を${total}問生成してください。

要件:
- 初級(easy): ${config.easy}問 — 中学英語レベル。短くシンプルな文。
- 中級(medium): ${config.medium}問 — 高校英語レベル。やや複雑な構文や表現を含む。
- 上級(hard): ${config.hard}問 — 大学・ビジネスレベル。慣用表現や微妙なニュアンスを含む。
${topicInstruction}
- 実際の会話や文章で使いそうなリアルな文にすること（教科書的すぎない自然な日本語）
- 各問題に difficulty を "easy", "medium", "hard" のいずれかで付与する

以下のJSON配列で返してください（余計なテキストは不要）:
[
  {"japanese": "日本語の文", "difficulty": "easy"},
  {"japanese": "日本語の文", "difficulty": "medium"},
  ...${total}問
]`;
}

interface GeneratedExercise {
  japanese: string;
  difficulty: string;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const today = getTodayString();

  const existing = await prisma.dailySet.findUnique({
    where: { userId_date: { userId, date: today } },
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

  if (existing) {
    return NextResponse.json(existing);
  }

  return NextResponse.json(null);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const today = getTodayString();

  const existing = await prisma.dailySet.findUnique({
    where: { userId_date: { userId, date: today } },
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

  if (existing) {
    return NextResponse.json(existing);
  }

  const body = await request.json();
  const selectedTopicIds =
    Array.isArray(body.selectedTopicIds)
      ? body.selectedTopicIds
          .filter((t: unknown): t is string => typeof t === "string")
          .map((t: string) => t.trim())
          .filter(Boolean)
      : [];
  const customTopic =
    typeof body.customTopic === "string" ? body.customTopic.trim() : "";
  const topics =
    Array.isArray(body.topics)
      ? body.topics
          .filter((t: unknown): t is string => typeof t === "string")
          .map((t: string) => t.trim())
          .filter(Boolean)
      : [];
  const config = {
    easy: body.easy ?? 2,
    medium: body.medium ?? 3,
    hard: body.hard ?? 2,
    topics,
  };

  const genai = await getGenAIForUser(userId);
  if (!genai) {
    return NextResponse.json(
      { error: "API_KEY_REQUIRED" },
      { status: 400 },
    );
  }

  try {
    const response = await withRetry(() =>
      genai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: buildPrompt(config),
        config: {
          responseMimeType: "application/json",
        },
      }),
    );

    const content = response.text;
    if (!content) {
      return NextResponse.json(
        { error: "Failed to generate exercises" },
        { status: 500 },
      );
    }

    const parsed = JSON.parse(content);
    const exercises: GeneratedExercise[] = Array.isArray(parsed)
      ? parsed
      : parsed.exercises || parsed.problems || Object.values(parsed)[0];

    await prisma.user.update({
      where: { id: userId },
      data: {
        preferredEasy: config.easy,
        preferredMedium: config.medium,
        preferredHard: config.hard,
        preferredTopicIds: selectedTopicIds,
        preferredCustomTopic: customTopic,
      },
    });

    const dailySet = await prisma.dailySet.create({
      data: {
        userId,
        date: today,
        topics,
        exercises: {
          create: exercises.map((ex: GeneratedExercise) => ({
            japaneseText: ex.japanese,
            difficulty: ex.difficulty || "medium",
          })),
        },
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
  } catch (error: unknown) {
    console.error("Exercise generation error:", error);
    const status =
      error instanceof Error && "status" in error
        ? (error as { status: number }).status
        : 500;
    let reason = "不明なエラーが発生しました。";
    if (status === 429) {
      reason = "APIの利用上限に達しました。しばらく待ってから再試行してください。";
    } else if (status === 503) {
      reason = "Gemini APIが一時的に混雑しています。しばらく待ってから再試行してください。";
    } else if (error instanceof Error) {
      const msg = error.message;
      if (msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
        reason = "APIの利用上限に達しました。プランや課金状態を確認してください。";
      } else if (msg.includes("UNAVAILABLE")) {
        reason = "Gemini APIが一時的に利用できません。しばらく待ってから再試行してください。";
      }
    }
    return NextResponse.json(
      { error: "GENERATION_FAILED", reason },
      { status },
    );
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const today = getTodayString();

  const existing = await prisma.dailySet.findUnique({
    where: { userId_date: { userId, date: today } },
  });

  if (!existing) {
    return NextResponse.json({ ok: true });
  }

  await prisma.submission.deleteMany({ where: { dailySetId: existing.id } });
  await prisma.exercise.deleteMany({ where: { dailySetId: existing.id } });
  await prisma.dailySet.delete({ where: { id: existing.id } });

  return NextResponse.json({ ok: true });
}

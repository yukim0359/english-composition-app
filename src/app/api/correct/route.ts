import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGenAIForUser } from "@/lib/gemini";
import { withRetry } from "@/lib/retry";

const CORRECTION_PROMPT = (japanese: string, userAnswer: string) =>
  `あなたはプロの英語教師です。以下の日本語文に対するユーザーの英訳を添削してください。

## 日本語（原文）
${japanese}

## ユーザーの英訳
${userAnswer}

## 指示
1. ユーザーの英訳を添削し、より自然で正確な英文に修正してください
2. 間違い・改善点を日本語でわかりやすく説明してください
3. 5段階でスコアをつけてください（1=要改善 〜 5=完璧）

以下のJSON形式で返してください（余計なテキストは不要）:
{
  "corrected": "修正後の英文",
  "feedback": "フィードバック（日本語で、修正理由・文法ポイントなどを説明）",
  "score": 4
}`;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await request.json();
  const { exerciseId, dailySetId, userAnswer } = body;

  if (!exerciseId || !dailySetId || !userAnswer?.trim()) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
  });

  if (!exercise) {
    return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
  }

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
        contents: CORRECTION_PROMPT(exercise.japaneseText, userAnswer),
        config: {
          responseMimeType: "application/json",
        },
      }),
    );

    const content = response.text;
    if (!content) {
      return NextResponse.json(
        { error: "Failed to get correction" },
        { status: 500 },
      );
    }

    const result = JSON.parse(content);

    const submission = await prisma.submission.create({
      data: {
        userId,
        exerciseId,
        dailySetId,
        userAnswer: userAnswer.trim(),
        correctedAnswer: result.corrected,
        feedback: result.feedback,
        score: Math.min(5, Math.max(1, result.score)),
      },
    });

    return NextResponse.json(submission);
  } catch (error: unknown) {
    console.error("Correction error:", error);
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
      { error: "CORRECTION_FAILED", reason },
      { status },
    );
  }
}

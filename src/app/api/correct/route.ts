import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { genai } from "@/lib/gemini";

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

  try {
    const response = await genai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: CORRECTION_PROMPT(exercise.japaneseText, userAnswer),
      config: {
        responseMimeType: "application/json",
      },
    });

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
  } catch (error) {
    console.error("Correction error:", error);
    return NextResponse.json(
      { error: "Failed to correct answer" },
      { status: 500 },
    );
  }
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ExerciseCard from "@/components/ExerciseCard";
import ExerciseSettings, {
  ExerciseConfig,
} from "@/components/ExerciseSettings";

interface Submission {
  id: string;
  userAnswer: string;
  correctedAnswer: string;
  feedback: string;
  score: number;
}

interface Exercise {
  id: string;
  japaneseText: string;
  difficulty: string;
  submissions: Submission[];
}

interface DailySet {
  id: string;
  date: string;
  topics?: string[];
  exercises: Exercise[];
}

interface ExercisePreset {
  easy: number;
  medium: number;
  hard: number;
  selectedTopicIds: string[];
  customTopic: string;
}

export default function PracticePage() {
  const [dailySet, setDailySet] = useState<DailySet | null>(null);
  const [preset, setPreset] = useState<ExercisePreset | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const [hasApiKey, setHasApiKey] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [exRes, keyRes, prefRes] = await Promise.all([
          fetch("/api/exercises"),
          fetch("/api/settings"),
          fetch("/api/preferences"),
        ]);
        if (!exRes.ok) throw new Error("Failed to fetch");
        const data = await exRes.json();
        if (data) setDailySet(data);
        if (keyRes.ok) {
          const keyData = await keyRes.json();
          setHasApiKey(!!keyData.hasKey);
        }
        if (prefRes.ok) {
          const pref = await prefRes.json();
          setPreset(pref);
        }
      } catch {
        setError("課題の確認に失敗しました。ページをリロードしてください。");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleGenerate = async (config: ExerciseConfig) => {
    setGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        if (errBody.error === "API_KEY_REQUIRED") {
          setHasApiKey(false);
          setError(
            "Gemini API キーが未登録です。設定ページでキーを登録してください。"
          );
          return;
        }
        throw new Error("Failed to generate");
      }
      const data = await res.json();
      setDailySet(data);
    } catch {
      setError("課題の生成に失敗しました。もう一度お試しください。");
    } finally {
      setGenerating(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("今日の課題を削除して作り直しますか？")) return;
    setResetting(true);
    try {
      const res = await fetch("/api/exercises", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setDailySet(null);
    } catch {
      setError("削除に失敗しました。");
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600" />
        <p className="text-gray-500 text-lg">確認中...</p>
      </div>
    );
  }

  if (error && !dailySet) {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!dailySet) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">今日の英作文</h1>
          <p className="text-sm text-gray-500 mt-1">
            難易度とトピックを選んで、今日の課題を生成しましょう
          </p>
        </div>
        {!hasApiKey && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <p className="text-amber-900 text-sm mb-2">
              課題の生成・添削には、あなたの Gemini API キーが必要です。
            </p>
            <Link
              href="/settings"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              設定で API キーを登録する →
            </Link>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        <ExerciseSettings
          onGenerate={handleGenerate}
          isGenerating={generating}
          disabled={!hasApiKey}
          initialConfig={preset}
        />
      </div>
    );
  }

  const completedCount = dailySet.exercises.filter(
    (ex) => ex.submissions.length > 0
  ).length;
  const totalCount = dailySet.exercises.length;
  const avgScore =
    completedCount > 0
      ? (
          dailySet.exercises
            .filter((ex) => ex.submissions.length > 0)
            .reduce((sum, ex) => sum + ex.submissions[0].score, 0) /
          completedCount
        ).toFixed(1)
      : null;

  return (
    <div className="max-w-3xl mx-auto">
      {!hasApiKey && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-amber-900 text-sm mb-2">
            API キーが未登録のため、添削できません。
          </p>
          <Link
            href="/settings"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            設定で API キーを登録する →
          </Link>
        </div>
      )}
      {/* Progress header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900">今日の英作文</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{dailySet.date}</span>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
            >
              {resetting ? "削除中..." : "お題を作り直す"}
            </button>
          </div>
        </div>
        {dailySet.topics && dailySet.topics.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {dailySet.topics.map((topic) => (
              <span
                key={topic}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200"
              >
                {topic}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
              style={{
                width: `${(completedCount / totalCount) * 100}%`,
              }}
            />
          </div>
          <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
            {completedCount} / {totalCount}
          </span>
          {avgScore && (
            <span className="text-sm text-gray-500">平均 {avgScore}</span>
          )}
        </div>
      </div>

      {/* Exercise cards */}
      <div className="space-y-6">
        {dailySet.exercises.map((exercise, i) => (
          <ExerciseCard
            key={exercise.id}
            index={i}
            exerciseId={exercise.id}
            dailySetId={dailySet.id}
            japaneseText={exercise.japaneseText}
            difficulty={exercise.difficulty}
            existingSubmission={
              exercise.submissions.length > 0
                ? exercise.submissions[0]
                : null
            }
            onSubmitted={(exId, sub) => {
              setDailySet((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  exercises: prev.exercises.map((ex) =>
                    ex.id === exId ? { ...ex, submissions: [sub] } : ex
                  ),
                };
              });
            }}
          />
        ))}
      </div>

      {completedCount === totalCount && totalCount > 0 && (
        <div className="mt-8 text-center bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
          <p className="text-xl font-bold text-indigo-700 mb-1">
            お疲れ様でした!
          </p>
          <p className="text-gray-600">
            今日の {totalCount} 問をすべて完了しました。平均スコア:{" "}
            {avgScore}/5
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import BookmarkButton from "@/components/BookmarkButton";
import DiffView from "@/components/DiffView";
import ScoreBadge from "@/components/ScoreBadge";
import VocabularyNotes from "@/components/VocabularyNotes";
import Markdown from "@/components/Markdown";

interface Submission {
  id: string;
  userAnswer: string;
  correctedAnswer: string;
  feedback: string;
  score: number;
  bookmarked?: boolean;
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

const difficultyLabel: Record<string, { label: string; className: string }> = {
  easy: { label: "初級", className: "bg-green-100 text-green-700" },
  medium: { label: "中級", className: "bg-amber-100 text-amber-700" },
  hard: { label: "上級", className: "bg-red-100 text-red-700" },
};

export default function HistoryDetailPage() {
  const params = useParams();
  const date = params.date as string;
  const [dailySet, setDailySet] = useState<DailySet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetail() {
      const res = await fetch(`/api/history?date=${date}`);
      if (res.ok) {
        setDailySet(await res.json());
      }
      setLoading(false);
    }
    fetchDetail();
  }, [date]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (!dailySet) {
    return (
      <div className="max-w-3xl mx-auto mt-20 text-center">
        <p className="text-gray-500 text-lg">
          この日の記録が見つかりません。
        </p>
        <Link
          href="/history"
          className="text-indigo-600 hover:text-indigo-700 font-medium mt-4 inline-block"
        >
          ← 履歴一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/history"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{date} の復習</h1>
      </div>
      {dailySet.topics && dailySet.topics.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
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

      <div className="space-y-6">
        {dailySet.exercises.map((exercise, i) => {
          const sub =
            exercise.submissions.length > 0 ? exercise.submissions[0] : null;
          const diff =
            difficultyLabel[exercise.difficulty] || difficultyLabel.medium;

          return (
            <div
              key={exercise.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold">
                      {i + 1}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${diff.className}`}
                    >
                      {diff.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {sub && (
                      <BookmarkButton
                        submissionId={sub.id}
                        initialBookmarked={sub.bookmarked ?? false}
                      />
                    )}
                    {sub && <ScoreBadge score={sub.score} />}
                  </div>
                </div>

                <p className="text-lg font-medium text-gray-900 mb-4 leading-relaxed">
                  {exercise.japaneseText}
                </p>

                {sub ? (
                  <div className="space-y-4">
                    <DiffView
                      original={sub.userAnswer}
                      corrected={sub.correctedAnswer}
                    />
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                      <p className="text-sm font-medium text-blue-700 mb-1">
                        フィードバック
                      </p>
                      <div className="text-gray-700 text-sm leading-relaxed">
                        <Markdown content={sub.feedback} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 italic">未回答</p>
                )}

                <div className="mt-4">
                  <VocabularyNotes exerciseId={exercise.id} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
  exercises: Exercise[];
}

function toDayNumber(dateText: string): number {
  const d = new Date(`${dateText}T00:00:00`);
  return Math.floor(d.getTime() / 86_400_000);
}

function calculateStreakStats(dailySets: DailySet[]) {
  const studiedDays = Array.from(
    new Set(
      dailySets
        .filter((ds) => ds.exercises.some((ex) => ex.submissions.length > 0))
        .map((ds) => ds.date),
    ),
  ).sort((a, b) => b.localeCompare(a));

  if (studiedDays.length === 0) {
    return { currentStreak: 0, longestStreak: 0, studiedDaysCount: 0 };
  }

  const dayNumbers = studiedDays.map(toDayNumber);

  let currentStreak = 1;
  for (let i = 1; i < dayNumbers.length; i++) {
    if (dayNumbers[i - 1] - dayNumbers[i] === 1) {
      currentStreak++;
    } else {
      break;
    }
  }

  let longestStreak = 1;
  let run = 1;
  for (let i = 1; i < dayNumbers.length; i++) {
    if (dayNumbers[i - 1] - dayNumbers[i] === 1) {
      run++;
      if (run > longestStreak) longestStreak = run;
    } else {
      run = 1;
    }
  }

  return {
    currentStreak,
    longestStreak,
    studiedDaysCount: studiedDays.length,
  };
}

export default function HistoryPage() {
  const [dailySets, setDailySets] = useState<DailySet[]>([]);
  const [loading, setLoading] = useState(true);
  const [scoreFilter, setScoreFilter] = useState<number | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      const params = scoreFilter ? `?maxScore=${scoreFilter}` : "";
      const res = await fetch(`/api/history${params}`);
      if (res.ok) {
        const data = await res.json();
        setDailySets(data);
      }
      setLoading(false);
    }
    fetchHistory();
  }, [scoreFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600" />
        <p className="text-gray-500">履歴を読み込んでいます...</p>
      </div>
    );
  }

  const streakStats = calculateStreakStats(dailySets);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">学習履歴</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">スコアフィルタ:</span>
          <select
            value={scoreFilter ?? ""}
            onChange={(e) =>
              setScoreFilter(e.target.value ? parseInt(e.target.value) : null)
            }
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">すべて</option>
            <option value="2">★2以下（復習推奨）</option>
            <option value="3">★3以下</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">現在の連続日数</p>
          <p className="text-2xl font-bold text-indigo-600">
            {streakStats.currentStreak}日
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">最長連続日数</p>
          <p className="text-2xl font-bold text-purple-600">
            {streakStats.longestStreak}日
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">取り組み日数</p>
          <p className="text-2xl font-bold text-gray-700">
            {streakStats.studiedDaysCount}日
          </p>
        </div>
      </div>

      {dailySets.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-gray-500 text-lg mb-2">
            {scoreFilter ? "該当する履歴がありません" : "まだ履歴がありません"}
          </p>
          <Link
            href="/practice"
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            練習を始める →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {dailySets.map((ds) => {
            const completed = ds.exercises.filter(
              (ex) => ex.submissions.length > 0,
            );
            const avgScore =
              completed.length > 0
                ? (
                    completed.reduce(
                      (sum, ex) => sum + ex.submissions[0].score,
                      0,
                    ) / completed.length
                  ).toFixed(1)
                : "-";

            return (
              <Link
                key={ds.id}
                href={`/history/${ds.date}`}
                className="block bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-indigo-300 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {ds.date}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {completed.length} / {ds.exercises.length} 問完了
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-indigo-600">
                      {avgScore}
                    </p>
                    <p className="text-xs text-gray-400">平均スコア</p>
                  </div>
                </div>
                {/* Mini score indicators */}
                <div className="flex gap-1.5 mt-3">
                  {ds.exercises.map((ex) => {
                    const score =
                      ex.submissions.length > 0
                        ? ex.submissions[0].score
                        : null;
                    const bg = score
                      ? score >= 4
                        ? "bg-emerald-400"
                        : score >= 3
                          ? "bg-yellow-400"
                          : "bg-red-400"
                      : "bg-gray-200";
                    return (
                      <div
                        key={ex.id}
                        className={`h-2 flex-1 rounded-full ${bg}`}
                        title={
                          score ? `${ex.japaneseText}: ${score}/5` : "未回答"
                        }
                      />
                    );
                  })}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

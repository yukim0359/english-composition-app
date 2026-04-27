"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

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
  exercises: Exercise[];
}

interface StudiedDate {
  date: string;
  count: number;
}

interface CalendarCell {
  date: string;
  count: number;
  isCurrentMonth: boolean;
  isVisible: boolean;
}

function toDayNumber(dateText: string): number {
  const [year, month, day] = dateText.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function getJstDateText(d = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function dayNumberToDateText(dayNumber: number): string {
  const d = new Date(dayNumber * 86_400_000);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthFromDateText(dateText: string): number {
  const [, month] = dateText.split("-");
  return parseInt(month, 10);
}

function getStudyCountMap(studiedDates: StudiedDate[]) {
  const map = new Map<string, number>();
  for (const { date, count } of studiedDates) {
    if (count > 0) map.set(date, count);
  }
  return map;
}

function buildCalendarGrid(
  studyCountByDate: Map<string, number>,
  weeks = 12,
): CalendarCell[][] {
  const todayDateText = getJstDateText();
  const todayDayNumber = toDayNumber(todayDateText);
  const todayDow = new Date(todayDayNumber * 86_400_000).getUTCDay();
  const todayMonth = getMonthFromDateText(todayDateText);
  const currentWeekStartDayNumber = todayDayNumber - todayDow;
  const gridStartDayNumber = currentWeekStartDayNumber - (weeks - 1) * 7;

  const columns: CalendarCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: CalendarCell[] = [];
    for (let d = 0; d < 7; d++) {
      const dayNumber = gridStartDayNumber + w * 7 + d;
      const dateText = dayNumberToDateText(dayNumber);
      const isFuture = dayNumber > todayDayNumber;
      const isCurrentMonth = getMonthFromDateText(dateText) === todayMonth;
      col.push({
        date: dateText,
        count: isFuture ? 0 : (studyCountByDate.get(dateText) ?? 0),
        isCurrentMonth,
        isVisible: !isFuture,
      });
    }
    columns.push(col);
  }
  return columns;
}

function getHeatClass(count: number) {
  if (count === 0) return "bg-gray-100";
  if (count <= 2) return "bg-emerald-200";
  if (count <= 4) return "bg-emerald-300";
  if (count <= 6) return "bg-emerald-400";
  return "bg-emerald-500";
}

function calculateStreakStats(studiedDates: StudiedDate[]) {
  const days = studiedDates
    .filter((d) => d.count > 0)
    .map((d) => d.date)
    .sort((a, b) => b.localeCompare(a));

  if (days.length === 0) {
    return { currentStreak: 0, longestStreak: 0, studiedDaysCount: 0 };
  }

  const dayNumbers = days.map(toDayNumber);

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

  return { currentStreak, longestStreak, studiedDaysCount: days.length };
}

const PAGE_SIZE = 10;

export default function HistoryPage() {
  const [studiedDates, setStudiedDates] = useState<StudiedDate[]>([]);
  const [dailySets, setDailySets] = useState<DailySet[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [scoreFilter, setScoreFilter] = useState<number | null>(null);

  useEffect(() => {
    async function fetchStats() {
      const res = await fetch("/api/history?mode=stats");
      if (res.ok) {
        const data = await res.json();
        setStudiedDates(data.studiedDates);
      }
      setLoadingStats(false);
    }
    fetchStats();
  }, []);

  useEffect(() => {
    async function fetchFirstPage() {
      setLoadingList(true);
      setDailySets([]);
      setNextCursor(null);
      setHasMore(false);

      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (scoreFilter) params.set("maxScore", String(scoreFilter));

      const res = await fetch(`/api/history?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDailySets(data.items);
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      }
      setLoadingList(false);
    }
    fetchFirstPage();
  }, [scoreFilter]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);

    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      before: nextCursor,
    });
    if (scoreFilter) params.set("maxScore", String(scoreFilter));

    const res = await fetch(`/api/history?${params}`);
    if (res.ok) {
      const data = await res.json();
      setDailySets((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    }
    setLoadingMore(false);
  }, [nextCursor, loadingMore, scoreFilter]);

  if (loadingStats || loadingList) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600" />
        <p className="text-gray-500">履歴を読み込んでいます...</p>
      </div>
    );
  }

  const streakStats = calculateStreakStats(studiedDates);
  const studyCountByDate = getStudyCountMap(studiedDates);
  const calendar = buildCalendarGrid(studyCountByDate);

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
          <p className="text-xs text-gray-500 mb-2">現在の連続日数</p>
          <p className="text-2xl font-bold text-indigo-600">
            {streakStats.currentStreak}日
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-2">最長連続日数</p>
          <p className="text-2xl font-bold text-gray-700">
            {streakStats.longestStreak}日
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-2">取り組み日数</p>
          <p className="text-2xl font-bold text-gray-700">
            {streakStats.studiedDaysCount}日
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">
            学習カレンダー（直近12週間）
          </p>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>少</span>
            <span className="w-3 h-3 rounded-sm bg-gray-100 inline-block" />
            <span className="w-3 h-3 rounded-sm bg-emerald-200 inline-block" />
            <span className="w-3 h-3 rounded-sm bg-emerald-300 inline-block" />
            <span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" />
            <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
            <span>多</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="inline-flex items-start gap-2">
            <div className="flex flex-col gap-1 pt-[1px] text-[10px] text-gray-400">
              <div className="h-3.5 leading-[14px]">Sun</div>
              <div className="h-3.5 leading-[14px]">Mon</div>
              <div className="h-3.5 leading-[14px]">Tue</div>
              <div className="h-3.5 leading-[14px]">Wed</div>
              <div className="h-3.5 leading-[14px]">Thu</div>
              <div className="h-3.5 leading-[14px]">Fri</div>
              <div className="h-3.5 leading-[14px]">Sat</div>
            </div>
            <div className="inline-flex gap-1">
              {calendar.map((week, i) => (
                <div key={i} className="flex flex-col gap-1">
                  {week.map((cell) => (
                    <div
                      key={cell.date}
                      className={`w-3.5 h-3.5 rounded-[3px] ${
                        cell.isVisible
                          ? getHeatClass(cell.count)
                          : "bg-transparent"
                      }`}
                      title={
                        cell.isVisible
                          ? `${cell.date}: ${cell.count}問完了`
                          : undefined
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
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

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 text-sm font-medium text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loadingMore ? "読み込み中..." : "さらに読む"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BookmarkButton from "@/components/BookmarkButton";
import DiffView from "@/components/DiffView";
import ScoreBadge from "@/components/ScoreBadge";
import Markdown from "@/components/Markdown";

interface BookmarkedSubmission {
  id: string;
  userAnswer: string;
  correctedAnswer: string;
  feedback: string;
  score: number;
  bookmarked: boolean;
  createdAt: string;
  exercise: { japaneseText: string; difficulty: string };
  dailySet: { date: string };
}

const difficultyLabel: Record<string, { label: string; className: string }> = {
  easy: { label: "初級", className: "bg-green-100 text-green-700" },
  medium: { label: "中級", className: "bg-amber-100 text-amber-700" },
  hard: { label: "上級", className: "bg-red-100 text-red-700" },
};

function BookmarkCard({ bm }: { bm: BookmarkedSubmission }) {
  const [open, setOpen] = useState(false);
  const diff =
    difficultyLabel[bm.exercise.difficulty] || difficultyLabel.medium;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((v) => !v); } }}
        className="w-full text-left p-4 sm:p-5 flex items-start gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <svg
          className={`w-4 h-4 mt-1 shrink-0 text-gray-400 transition-transform ${open ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-base font-medium text-gray-900 leading-relaxed">
            {bm.exercise.japaneseText}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <Link
              href={`/history/${bm.dailySet.date}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-gray-400 hover:text-indigo-600 transition-colors"
            >
              {bm.dailySet.date}
            </Link>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${diff.className}`}
            >
              {diff.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <BookmarkButton submissionId={bm.id} initialBookmarked={bm.bookmarked} />
          <ScoreBadge score={bm.score} />
        </div>
      </div>

      {open && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 space-y-4 border-t border-gray-100">
          <div className="pt-4">
            <DiffView original={bm.userAnswer} corrected={bm.correctedAnswer} />
          </div>
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm font-medium text-blue-700 mb-1">
              フィードバック
            </p>
            <div className="text-gray-700 text-sm leading-relaxed">
              <Markdown content={bm.feedback} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkedSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/bookmarks");
      if (res.ok) {
        setBookmarks(await res.json());
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600" />
        <p className="text-gray-500">読み込んでいます...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ブックマーク</h1>
        <p className="text-sm text-gray-500 mt-1">
          気になった問題を保存して、いつでも見返せます
        </p>
      </div>

      {bookmarks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-gray-500 text-lg mb-2">
            ブックマークした問題はまだありません
          </p>
          <p className="text-sm text-gray-400">
            添削結果のしおりアイコンから追加できます
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookmarks.map((bm) => (
            <BookmarkCard key={bm.id} bm={bm} />
          ))}
        </div>
      )}
    </div>
  );
}

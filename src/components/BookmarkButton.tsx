"use client";

import { useState } from "react";

interface BookmarkButtonProps {
  submissionId: string;
  initialBookmarked: boolean;
}

export default function BookmarkButton({
  submissionId,
  initialBookmarked,
}: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId }),
      });
      if (res.ok) {
        const data = await res.json();
        setBookmarked(data.bookmarked);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      title={bookmarked ? "ブックマークを外す" : "ブックマークに追加"}
      aria-label={bookmarked ? "ブックマークを外す" : "ブックマークに追加"}
      className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
        bookmarked
          ? "text-amber-500 hover:text-amber-600 hover:bg-amber-50"
          : "text-gray-300 hover:text-amber-400 hover:bg-gray-50"
      }`}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    </button>
  );
}

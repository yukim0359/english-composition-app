"use client";

import { useState } from "react";
import DiffView from "./DiffView";
import ScoreBadge from "./ScoreBadge";
import Markdown from "./Markdown";

interface Submission {
  id: string;
  userAnswer: string;
  correctedAnswer: string;
  feedback: string;
  score: number;
}

interface ExerciseCardProps {
  index: number;
  exerciseId: string;
  dailySetId: string;
  japaneseText: string;
  difficulty: string;
  existingSubmission?: Submission | null;
  onSubmitted?: (exerciseId: string, submission: Submission) => void;
}

const difficultyLabel: Record<string, { label: string; className: string }> = {
  easy: { label: "初級", className: "bg-green-100 text-green-700" },
  medium: { label: "中級", className: "bg-amber-100 text-amber-700" },
  hard: { label: "上級", className: "bg-red-100 text-red-700" },
};

export default function ExerciseCard({
  index,
  exerciseId,
  dailySetId,
  japaneseText,
  difficulty,
  existingSubmission,
  onSubmitted,
}: ExerciseCardProps) {
  const [answer, setAnswer] = useState("");
  const [submission, setSubmission] = useState<Submission | null>(
    existingSubmission || null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!answer.trim()) return;

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId, dailySetId, userAnswer: answer }),
      });

      if (!res.ok) {
        throw new Error("Failed to submit");
      }

      const data = await res.json();
      setSubmission(data);
      onSubmitted?.(exerciseId, data);
    } catch {
      setError("添削に失敗しました。もう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const diff = difficultyLabel[difficulty] || difficultyLabel.medium;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold">
              {index + 1}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${diff.className}`}
            >
              {diff.label}
            </span>
          </div>
          {submission && <ScoreBadge score={submission.score} />}
        </div>

        {/* Japanese text */}
        <p className="text-lg font-medium text-gray-900 mb-4 leading-relaxed">
          {japaneseText}
        </p>

        {/* Answer input or result */}
        {!submission ? (
          <div className="space-y-3">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="英訳を入力してください..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-gray-900 placeholder-gray-400 transition-colors"
              rows={2}
              disabled={isSubmitting}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !answer.trim()}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  添削中...
                </>
              ) : (
                "添削する"
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <DiffView
              original={submission.userAnswer}
              corrected={submission.correctedAnswer}
            />
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <p className="text-sm font-medium text-blue-700 mb-1">
                フィードバック
              </p>
              <div className="text-gray-700 text-sm leading-relaxed">
                <Markdown content={submission.feedback} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

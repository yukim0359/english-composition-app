"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import BookmarkButton from "./BookmarkButton";
import DiffView from "./DiffView";
import ScoreBadge from "./ScoreBadge";
import Markdown from "./Markdown";

interface Submission {
  id: string;
  userAnswer: string;
  correctedAnswer: string;
  feedback: string;
  score: number;
  bookmarked?: boolean;
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

  const appendFromSpeech = useCallback((text: string) => {
    if (!text) return;
    setAnswer((prev) => {
      const needsSpace = prev.length > 0 && !/\s$/.test(prev);
      return prev + (needsSpace ? " " : "") + text;
    });
  }, []);

  const { supported: speechSupported, isListening, start: startSpeech, stop: stopSpeech } =
    useSpeechRecognition(appendFromSpeech, "en-US");

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
        const errBody = await res.json().catch(() => ({}));
        if (errBody.error === "API_KEY_REQUIRED") {
          setError("API_KEY_REQUIRED");
          return;
        }
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
          <div className="flex items-center gap-1">
            {submission && (
              <BookmarkButton
                submissionId={submission.id}
                initialBookmarked={submission.bookmarked ?? false}
              />
            )}
            {submission && <ScoreBadge score={submission.score} />}
          </div>
        </div>

        {/* Japanese text */}
        <p className="text-lg font-medium text-gray-900 mb-4 leading-relaxed">
          {japaneseText}
        </p>

        {/* Answer input or result */}
        {!submission ? (
          <div className="space-y-3">
            <div className="flex gap-2 items-stretch">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="英訳を入力してください..."
                className="flex-1 min-w-0 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-gray-900 placeholder-gray-400 transition-colors"
                rows={2}
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => (isListening ? stopSpeech() : startSpeech())}
                disabled={isSubmitting || !speechSupported}
                title={
                  !speechSupported
                    ? "このブラウザでは音声入力を利用できません（Chrome / Edge 推奨）"
                    : isListening
                      ? "音声入力を停止"
                      : "音声入力（英語・マイク許可が必要）"
                }
                className={`shrink-0 w-12 rounded-lg border flex items-center justify-center transition-colors ${
                  isListening
                    ? "bg-red-50 border-red-300 text-red-600 hover:bg-red-100"
                    : "bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
                aria-pressed={isListening}
                aria-label={isListening ? "音声入力を停止" : "音声入力を開始"}
              >
                {isListening ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <rect x="6" y="6" width="12" height="12" rx="1" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                  </svg>
                )}
              </button>
            </div>
            {speechSupported ? (
              <p className="text-xs text-gray-500">
                マイクボタンで英語の音声入力ができます（Chrome / Edge など）。初回はマイクの許可を求められます。
              </p>
            ) : (
              <p className="text-xs text-amber-700">
                音声入力はこのブラウザでは未対応です。キーボードで入力するか、Chrome / Edge をお試しください。
              </p>
            )}
            {error === "API_KEY_REQUIRED" ? (
              <p className="text-sm text-amber-800">
                Gemini API キーが未登録です。{" "}
                <Link
                  href="/settings"
                  className="font-medium text-indigo-600 hover:text-indigo-700 underline"
                >
                  設定で登録
                </Link>
              </p>
            ) : (
              error && <p className="text-sm text-red-600">{error}</p>
            )}
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

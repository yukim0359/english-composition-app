"use client";

import { useState } from "react";

const TOPICS = [
  { id: "daily", label: "日常会話" },
  { id: "shopping", label: "買い物・レストラン" },
  { id: "travel", label: "旅行" },
  { id: "business", label: "仕事・ビジネス" },
  { id: "email", label: "メール・チャット" },
  { id: "school", label: "学校・勉強" },
  { id: "hobby", label: "趣味・スポーツ" },
  { id: "news", label: "ニュース・時事" },
  { id: "cs", label: "コンピュータサイエンス" },
];

export interface ExerciseConfig {
  easy: number;
  medium: number;
  hard: number;
  topics: string[];
}

interface ExerciseSettingsProps {
  onGenerate: (config: ExerciseConfig) => void;
  isGenerating: boolean;
}

export default function ExerciseSettings({
  onGenerate,
  isGenerating,
}: ExerciseSettingsProps) {
  const [easy, setEasy] = useState(2);
  const [medium, setMedium] = useState(3);
  const [hard, setHard] = useState(2);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [customTopic, setCustomTopic] = useState("");

  const total = easy + medium + hard;

  const adjustCount = (
    target: "easy" | "medium" | "hard",
    value: number
  ) => {
    const others =
      target === "easy"
        ? medium + hard
        : target === "medium"
        ? easy + hard
        : easy + medium;

    const clamped = Math.min(7, Math.max(0, value));
    const remaining = 7 - clamped;

    if (target === "easy") {
      setEasy(clamped);
      if (remaining < others) {
        const ratio = remaining / (others || 1);
        setMedium(Math.round(medium * ratio));
        setHard(7 - clamped - Math.round(medium * ratio));
      }
    } else if (target === "medium") {
      setMedium(clamped);
      if (remaining < others) {
        const ratio = remaining / (others || 1);
        setEasy(Math.round(easy * ratio));
        setHard(7 - clamped - Math.round(easy * ratio));
      }
    } else {
      setHard(clamped);
      if (remaining < others) {
        const ratio = remaining / (others || 1);
        setEasy(Math.round(easy * ratio));
        setMedium(7 - clamped - Math.round(easy * ratio));
      }
    }
  };

  const toggleTopic = (topicId: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId)
        ? prev.filter((t) => t !== topicId)
        : [...prev, topicId]
    );
  };

  const handleGenerate = () => {
    const presetLabels = selectedTopics.map(
      (id) => TOPICS.find((t) => t.id === id)?.label || id
    );
    const custom = customTopic.trim();
    const allTopics = custom
      ? [...presetLabels, custom]
      : presetLabels;

    onGenerate({
      easy: Math.max(0, easy),
      medium: Math.max(0, medium),
      hard: Math.max(0, hard),
      topics: allTopics,
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 mb-8">
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        今日の課題を設定
      </h2>

      {/* Difficulty distribution */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 mb-3">
          難易度の配分
          <span className="ml-2 text-gray-400 font-normal">
            （合計 {total} 問{total !== 7 && " — 7問にしてください"}）
          </span>
        </p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "初級", value: easy, color: "green", setter: (v: number) => adjustCount("easy", v) },
            { label: "中級", value: medium, color: "amber", setter: (v: number) => adjustCount("medium", v) },
            { label: "上級", value: hard, color: "red", setter: (v: number) => adjustCount("hard", v) },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 bg-${item.color}-100 text-${item.color}-700`}
              >
                {item.label}
              </span>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => item.setter(item.value - 1)}
                  disabled={item.value <= 0}
                  className="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-lg font-medium"
                >
                  -
                </button>
                <span className="text-2xl font-bold text-gray-900 w-8 text-center">
                  {item.value}
                </span>
                <button
                  type="button"
                  onClick={() => item.setter(item.value + 1)}
                  disabled={total >= 7}
                  className="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-lg font-medium"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Topic selection */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 mb-3">
          トピック
          <span className="ml-2 text-gray-400 font-normal">
            （未選択ならおまかせ）
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((topic) => {
            const selected = selectedTopics.includes(topic.id);
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => toggleTopic(topic.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  selected
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {topic.label}
              </button>
            );
          })}
        </div>
        <div className="mt-3">
          <input
            type="text"
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            placeholder="自由入力（例: 映画の感想、料理のレシピ、面接対策…）"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || total !== 7}
        className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
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
            課題を生成中...
          </>
        ) : (
          "今日の課題を生成"
        )}
      </button>
    </div>
  );
}

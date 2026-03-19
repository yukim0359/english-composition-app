"use client";

const scoreConfig: Record<number, { bg: string; text: string; label: string }> =
  {
    1: { bg: "bg-red-100", text: "text-red-700", label: "要改善" },
    2: { bg: "bg-orange-100", text: "text-orange-700", label: "もう少し" },
    3: { bg: "bg-yellow-100", text: "text-yellow-700", label: "まあまあ" },
    4: { bg: "bg-blue-100", text: "text-blue-700", label: "良い" },
    5: { bg: "bg-emerald-100", text: "text-emerald-700", label: "完璧!" },
  };

export default function ScoreBadge({ score }: { score: number }) {
  const config = scoreConfig[score] || scoreConfig[3];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-medium ${config.bg} ${config.text}`}
    >
      <span className="text-base">{"★".repeat(score)}{"☆".repeat(5 - score)}</span>
      <span>{config.label}</span>
    </span>
  );
}

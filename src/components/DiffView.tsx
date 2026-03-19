"use client";

import { computeWordDiff, DiffSegment } from "@/lib/diff";

interface DiffViewProps {
  original: string;
  corrected: string;
}

export default function DiffView({ original, corrected }: DiffViewProps) {
  const segments = computeWordDiff(original, corrected);

  if (original.trim().toLowerCase() === corrected.trim().toLowerCase()) {
    return (
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
        <p className="text-sm font-medium text-emerald-700 mb-1">Perfect!</p>
        <p className="text-emerald-900">{corrected}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-red-50 border border-red-200 p-4">
        <p className="text-sm font-medium text-red-600 mb-1">あなたの回答</p>
        <p className="text-gray-800 leading-relaxed">
          {segments.map((seg: DiffSegment, i: number) =>
            seg.type === "removed" ? (
              <span key={i}>
                <span className="bg-red-200 text-red-800 line-through px-0.5 rounded">
                  {seg.text}
                </span>{" "}
              </span>
            ) : seg.type === "equal" ? (
              <span key={i}>{seg.originalText || seg.text} </span>
            ) : null
          )}
        </p>
      </div>
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
        <p className="text-sm font-medium text-emerald-600 mb-1">修正後</p>
        <p className="text-gray-800 leading-relaxed">
          {segments.map((seg: DiffSegment, i: number) =>
            seg.type === "added" ? (
              <span key={i}>
                <span className="bg-emerald-200 text-emerald-800 px-0.5 rounded font-medium">
                  {seg.text}
                </span>{" "}
              </span>
            ) : seg.type === "equal" ? (
              <span key={i}>{seg.text} </span>
            ) : null
          )}
        </p>
      </div>
    </div>
  );
}

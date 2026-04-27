"use client";

import { useCallback, useEffect, useState } from "react";

interface Note {
  id: string;
  english: string;
  japanese: string;
}

interface DraftRow {
  english: string;
  japanese: string;
}

interface VocabularyNotesProps {
  exerciseId: string;
  initialNotes?: Note[];
}

const emptyRow = (): DraftRow => ({ english: "", japanese: "" });

export default function VocabularyNotes({
  exerciseId,
  initialNotes,
}: VocabularyNotesProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes ?? []);
  const [loaded, setLoaded] = useState(!!initialNotes);
  const [rows, setRows] = useState<DraftRow[]>([emptyRow()]);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<DraftRow>(emptyRow());
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (loaded) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/vocabulary?exerciseId=${exerciseId}`,
        );
        if (res.ok && !cancelled) {
          setNotes(await res.json());
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [exerciseId, loaded]);

  const updateRow = (index: number, field: keyof DraftRow, value: string) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );
  };

  const hasValidDraft = rows.some((r) => r.english.trim());

  const handleSubmit = useCallback(async () => {
    const entries = rows.filter((r) => r.english.trim());
    if (entries.length === 0) return;
    setAdding(true);
    try {
      const res = await fetch("/api/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId, entries }),
      });
      if (res.ok) {
        const created: Note[] = await res.json();
        setNotes((prev) => [...prev, ...created]);
        setRows([emptyRow()]);
      }
    } finally {
      setAdding(false);
    }
  }, [exerciseId, rows]);

  const handleDelete = useCallback(async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/vocabulary?id=${id}`, { method: "DELETE" });
  }, []);

  const handleEditStart = useCallback((note: Note) => {
    setEditingId(note.id);
    setEditingRow({ english: note.english, japanese: note.japanese ?? "" });
  }, []);

  const handleEditCancel = useCallback(() => {
    setEditingId(null);
    setEditingRow(emptyRow());
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editingId || !editingRow.english.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch("/api/vocabulary", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          english: editingRow.english,
          japanese: editingRow.japanese,
        }),
      });
      if (!res.ok) return;
      const updated: Note = await res.json();
      setNotes((prev) =>
        prev.map((n) =>
          n.id === updated.id
            ? {
                ...n,
                english: updated.english,
                japanese: updated.japanese,
              }
            : n,
        ),
      );
      setEditingId(null);
      setEditingRow(emptyRow());
    } finally {
      setSavingEdit(false);
    }
  }, [editingId, editingRow]);

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-amber-50 transition-colors rounded-lg"
      >
        <svg
          className={`w-3.5 h-3.5 text-amber-500 transition-transform ${open ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5l7 7-7 7"
          />
        </svg>
        <span className="text-sm font-medium text-amber-700">
          単語・表現メモ
        </span>
        {notes.length > 0 && (
          <span className="text-xs text-amber-500 bg-amber-100 px-1.5 py-0.5 rounded-full">
            {notes.length}
          </span>
        )}
      </button>

      {open && (
        <div className="px-4 pb-3 space-y-2">
          {notes.length > 0 && (
            <ul className="space-y-1">
              {notes.map((note) => (
                <li
                  key={note.id}
                  className="flex items-center gap-2 group text-sm"
                >
                  {editingId === note.id ? (
                    <>
                      <input
                        type="text"
                        value={editingRow.english}
                        onChange={(e) =>
                          setEditingRow((prev) => ({
                            ...prev,
                            english: e.target.value,
                          }))
                        }
                        placeholder="英語"
                        className="flex-1 min-w-0 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-amber-400 focus:border-amber-400 text-gray-900 placeholder-gray-400"
                      />
                      <input
                        type="text"
                        value={editingRow.japanese}
                        onChange={(e) =>
                          setEditingRow((prev) => ({
                            ...prev,
                            japanese: e.target.value,
                          }))
                        }
                        placeholder="日本語（任意）"
                        className="flex-1 min-w-0 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-amber-400 focus:border-amber-400 text-gray-900 placeholder-gray-400"
                      />
                      <button
                        type="button"
                        onClick={handleEditSave}
                        disabled={savingEdit || !editingRow.english.trim()}
                        className="text-xs px-2 py-1 rounded-md text-amber-700 bg-amber-100 hover:bg-amber-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        onClick={handleEditCancel}
                        disabled={savingEdit}
                        className="text-xs px-2 py-1 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        キャンセル
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-gray-400 text-xs">•</span>
                      <span className="font-medium text-gray-800">
                        {note.english}
                      </span>
                      {note.japanese && (
                        <span className="text-gray-500">{note.japanese}</span>
                      )}
                      <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          type="button"
                          onClick={() => handleEditStart(note)}
                          className="text-gray-400 hover:text-indigo-500 transition-colors p-0.5"
                          aria-label="編集"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.232 5.232l3.536 3.536M9 11l6.232-6.232a2.5 2.5 0 113.536 3.536L12.536 14.536a4 4 0 01-1.79 1.04L8 16l.424-2.746A4 4 0 019.464 11.536z"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(note.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
                          aria-label="削除"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-1.5">
            {rows.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={row.english}
                  onChange={(e) => updateRow(i, "english", e.target.value)}
                  placeholder="英語"
                  className="flex-1 min-w-0 px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-amber-400 focus:border-amber-400 text-gray-900 placeholder-gray-400"
                />
                <input
                  type="text"
                  value={row.japanese}
                  onChange={(e) => updateRow(i, "japanese", e.target.value)}
                  placeholder="日本語（任意）"
                  className="flex-1 min-w-0 px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-amber-400 focus:border-amber-400 text-gray-900 placeholder-gray-400"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRows((prev) => [...prev, emptyRow()])}
              className="text-sm text-amber-600 hover:text-amber-800 transition-colors flex items-center gap-1"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              行を追加
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={adding || !hasValidDraft}
              className="ml-auto shrink-0 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {adding ? "登録中..." : "登録"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

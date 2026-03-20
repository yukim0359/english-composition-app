"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setHasKey(data.hasKey);
        setMaskedKey(data.maskedKey);
      }
      setLoading(false);
    }
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      if (!res.ok) throw new Error("Failed to save");

      setHasKey(true);
      const masked = apiKey.slice(0, 8) + "..." + apiKey.slice(-4);
      setMaskedKey(masked);
      setApiKey("");
      setMessage("保存しました");
    } catch {
      setMessage("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">設定</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Gemini API キー
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          課題の生成と添削に使用します。キーはサーバー上で暗号化して保存されます。
        </p>

        {hasKey && (
          <div className="mb-4 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-sm text-emerald-700">
              登録済み: <code className="font-mono text-xs">{maskedKey}</code>
            </p>
          </div>
        )}

        <div className="space-y-3">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={hasKey ? "新しいキーで上書き..." : "APIキーを入力"}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />

          <button
            onClick={handleSave}
            disabled={saving || !apiKey.trim()}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "保存中..." : "保存"}
          </button>

          {message && (
            <p className={`text-sm ${message.includes("失敗") ? "text-red-600" : "text-emerald-600"}`}>
              {message}
            </p>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500 mb-2">APIキーの取得方法:</p>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-700 underline"
              >
                Google AI Studio
              </a>{" "}
              にアクセス
            </li>
            <li>Googleアカウントでログイン</li>
            <li>「Create API Key」でキーを作成（無料）</li>
            <li>作成されたキーをコピーして上の欄に貼り付け</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

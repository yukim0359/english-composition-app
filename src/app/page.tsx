"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push("/practice");
    }
  }, [session, router]);

  if (status === "loading" || session) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
          <span className="text-6xl">✍️</span>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            英作文ドリル
          </h1>
          <p className="mt-3 text-gray-500 leading-relaxed">
            毎日の英訳課題をAIが自動生成・添削。
            <br />
            英作文力を着実に伸ばす学習アプリ。
          </p>
        </div>

        <button
          onClick={() => signIn("google", { callbackUrl: "/practice" })}
          className="inline-flex items-center gap-3 px-6 py-3 bg-white border border-gray-300 rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 transition-all text-gray-700 font-medium"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Googleアカウントでログイン
        </button>

        <p className="text-xs text-gray-400">
          ログインすると学習データが保存され、進捗を管理できます
        </p>
      </div>
    </div>
  );
}

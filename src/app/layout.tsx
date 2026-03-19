import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import "./globals.css";
import Navbar from "@/components/Navbar";
import SessionProvider from "@/components/SessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "英作文ドリル - 毎日のAI英訳練習",
  description:
    "毎日7問の英訳課題をAIが自動生成・添削。英作文力を着実に伸ばす学習アプリ。",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✍️</text></svg>",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} font-sans antialiased bg-gray-50 text-gray-900`}
      >
        <SessionProvider session={session}>
          <Navbar />
          <main className="px-4 sm:px-6 py-8">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}

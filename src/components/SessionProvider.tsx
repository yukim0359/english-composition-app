"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export default function SessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: unknown;
}) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <NextAuthSessionProvider session={session as any}>
      {children}
    </NextAuthSessionProvider>
  );
}

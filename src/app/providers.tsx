"use client";
import { ReactNode, useMemo } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

export default function Providers({ children }: { children: ReactNode }) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL as string | undefined;
  const client = useMemo(() => (convexUrl ? new ConvexReactClient(convexUrl) : null), [convexUrl]);
  if (!client) {
    return (
      <div className="p-4">
        <div className="mb-3 rounded border bg-yellow-50 text-yellow-900 p-3 text-sm">
          Missing NEXT_PUBLIC_CONVEX_URL. Add it to .env.local and restart the dev server.
        </div>
        {children}
      </div>
    );
  }
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}



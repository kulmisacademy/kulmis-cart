"use client";

import dynamic from "next/dynamic";

/**
 * `nextjs-toploader` drives nprogress and patches `history`; rendering it only on the
 * client avoids React 19 / Turbopack hydration edge cases (`removeChild` NotFoundError).
 */
const NextTopLoader = dynamic(() => import("nextjs-toploader"), {
  ssr: false,
});

export function ClientTopLoader() {
  return (
    <NextTopLoader
      color="#16a34a"
      height={3}
      showSpinner={false}
      crawlSpeed={200}
      shadow="0 0 12px rgba(22, 163, 74, 0.45)"
      zIndex={99999}
    />
  );
}

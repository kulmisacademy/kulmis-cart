/**
 * Run a router callback after the current task so the App Router action queue
 * is initialized (avoids Next.js E668: "Router action dispatched before initialization").
 */
export function deferRouterAction(fn: () => void): void {
  if (typeof window === "undefined") return;
  window.setTimeout(fn, 0);
}

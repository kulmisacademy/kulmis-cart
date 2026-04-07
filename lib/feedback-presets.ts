/** Single-select preset options for post-order feedback (maps to rating 5 in DB). */
export const FEEDBACK_PRESETS = [
  "Fast delivery 🚀",
  "Good quality 👍",
  "Affordable price 💰",
  "Excellent service ⭐",
  "Trusted store ✅",
  "Recommended 🔥",
] as const;

export type FeedbackPreset = (typeof FEEDBACK_PRESETS)[number];

const presetSet = new Set<string>(FEEDBACK_PRESETS);

export function isValidFeedbackPreset(value: string): value is FeedbackPreset {
  return presetSet.has(value);
}

/** Preset praise lines — all map to 5★ for store average. */
export function ratingForPreset(preset: FeedbackPreset): number {
  void preset;
  return 5;
}

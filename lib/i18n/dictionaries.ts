import type { Locale } from "./types";
import ar from "./messages/ar.json";
import en from "./messages/en.json";
import so from "./messages/so.json";

export const dictionaries: Record<Locale, typeof so> = {
  so,
  en,
  ar,
};

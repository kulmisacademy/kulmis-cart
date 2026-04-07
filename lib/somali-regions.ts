/** Gobolada Soomaaliya — official region names for vendor registration. */
export const SOMALI_REGIONS = [
  "Banaadir",
  "Awdal",
  "Woqooyi Galbeed",
  "Togdheer",
  "Sanaag",
  "Sool",
  "Bari",
  "Nugaal",
  "Mudug",
  "Galgaduud",
  "Hiiraan",
  "Middle Shabelle",
  "Lower Shabelle",
  "Bay",
  "Bakool",
  "Gedo",
  "Middle Juba",
  "Lower Juba",
] as const;

export type SomaliRegion = (typeof SOMALI_REGIONS)[number];

/** Role string returned by login/register APIs — source of truth is always server + httpOnly cookies, not client guesses. */
export type AppRole = "customer" | "vendor" | "admin";

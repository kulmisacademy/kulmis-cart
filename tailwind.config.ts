import type { Config } from "tailwindcss";

/**
 * LAAS24 brand tokens — source of truth for tooling/IDE.
 * Runtime theme: `app/globals.css` (`@theme inline`, id="laas-colors").
 */
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#16A34A",
        secondary: "#FACC15",
      },
    },
  },
};

export default config;

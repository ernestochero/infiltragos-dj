import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "dark-bg": "#121212",
        "card-bg": "#1e1e1e",
        accent: "#1DB954",
        "accent-hover": "#1ED760",
      },
    },
  },
  plugins: [],
};

export default config;

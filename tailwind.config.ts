import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"]
      },
      colors: {
        ink: "#181713",
        paper: "#f7f1e7",
        clay: "#c75d3b",
        leaf: "#61705a",
        honey: "#d6a63d",
        slate: "#414245"
      },
      boxShadow: {
        soft: "0 18px 60px rgb(24 23 19 / 0.14)"
      }
    }
  },
  plugins: []
};

export default config;

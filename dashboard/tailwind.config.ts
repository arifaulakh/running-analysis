import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17211f",
        field: "#f8f9f7",
        paper: "#ffffff",
        line: "#d8ded8",
        moss: "#3f7a5a",
        coral: "#b85c42",
        marine: "#1f5e7a",
        sun: "#9a6a19",
        plum: "#785d7d"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "ui-serif", "Georgia", "serif"]
      },
      borderRadius: {
        xl: "0.5rem",
        "2xl": "0.5rem"
      },
      boxShadow: {
        soft: "0 1px 2px rgba(23, 33, 31, 0.04), 0 16px 38px -30px rgba(23, 33, 31, 0.24)",
        lift: "0 2px 4px rgba(23, 33, 31, 0.05), 0 22px 48px -30px rgba(23, 33, 31, 0.28)"
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both"
      }
    }
  },
  plugins: []
};

export default config;

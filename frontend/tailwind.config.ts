import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#C2410C",
          hover: "#9A3412",
          ball: "#EA580C",
          tint: "#FFF1E8",
        },
        ink: {
          DEFAULT: "#111827",
          muted: "#5B6472",
        },
        court: "#B87333",
        surface: "#FFFFFF",
        canvas: "#F7F5F2",
        line: "#E5E1DA",
        success: {
          DEFAULT: "#15803D",
          tint: "#E8F5EC",
        },
        danger: {
          DEFAULT: "#B91C1C",
          tint: "#FDECEC",
        },
        warning: {
          DEFAULT: "#B45309",
          tint: "#FEF3E2",
        },
      },
      borderRadius: {
        input: "8px",
        btn: "8px",
        card: "12px",
        sheet: "12px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.06)",
        sheet: "0 1px 2px rgba(0,0,0,0.06)",
      },
      fontSize: {
        meta: ["12px", { lineHeight: "16px" }],
        body: ["14px", { lineHeight: "20px" }],
        input: ["16px", { lineHeight: "24px" }],
        section: ["18px", { lineHeight: "26px" }],
        title: ["22px", { lineHeight: "28px" }],
        stat: ["28px", { lineHeight: "32px" }],
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
    },
  },
  plugins: [],
};

export default config;

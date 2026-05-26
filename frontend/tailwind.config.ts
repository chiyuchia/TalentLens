import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-down": {
          from: { opacity: "0", transform: "translateY(-12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-left": {
          from: { opacity: "0", transform: "translateX(-16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "fade-in-right": {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "shimmer": {
          from: { backgroundPosition: "-200% 0" },
          to: { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out both",
        "fade-in-up": "fade-in-up 0.5s ease-out both",
        "fade-in-down": "fade-in-down 0.4s ease-out both",
        "fade-in-left": "fade-in-left 0.4s ease-out both",
        "fade-in-right": "fade-in-right 0.4s ease-out both",
        "scale-in": "scale-in 0.35s ease-out both",
        "slide-up": "slide-up 0.4s ease-out both",
        "shimmer": "shimmer 2s linear infinite",
        // Stagger delay variants
        "fade-in-up-1": "fade-in-up 0.5s ease-out 0.05s both",
        "fade-in-up-2": "fade-in-up 0.5s ease-out 0.1s both",
        "fade-in-up-3": "fade-in-up 0.5s ease-out 0.15s both",
        "fade-in-up-4": "fade-in-up 0.5s ease-out 0.2s both",
        "fade-in-up-5": "fade-in-up 0.5s ease-out 0.25s both",
        "fade-in-up-6": "fade-in-up 0.5s ease-out 0.3s both",
        // Alias that CandidateDetailPage already uses
        fadeIn: "fade-in 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;

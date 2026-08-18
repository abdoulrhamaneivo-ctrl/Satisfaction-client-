/**
 * Tailwind preset for the Trovy design system.
 *
 * Each app extends its own `tailwind.config.ts` with this preset, so the
 * three surfaces (landing, app, admin) share the same color scale, font
 * families, keyframes, and easings without duplicating token tables.
 *
 * The preset only sets what design-system primitives need. Apps can still
 * add their own keys (e.g. chart colors) on top of `theme.extend`.
 */
import type { Config } from "tailwindcss";

const preset: Partial<Config> = {
  darkMode: ["class"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.25rem",
        lg: "2rem",
      },
      screens: {
        "2xl": "80rem",
      },
    },
    extend: {
      colors: {
        // Surfaces
        bg: {
          0: "var(--ds-bg-0)",
          1: "var(--ds-bg-1)",
          2: "var(--ds-bg-2)",
          3: "var(--ds-bg-3)",
          inset: "var(--ds-bg-inset)",
        },
        ink: "var(--ds-fg)",
        fg: {
          DEFAULT: "var(--ds-fg)",
          secondary: "var(--ds-fg-secondary)",
          tertiary: "var(--ds-fg-tertiary)",
          quaternary: "var(--ds-fg-quaternary)",
          inverse: "var(--ds-fg-inverse)",
        },
        // Accent
        accent: {
          DEFAULT: "var(--ds-accent)",
          hover: "var(--ds-accent-hover)",
          pressed: "var(--ds-accent-pressed)",
          soft: "var(--ds-accent-soft)",
          softer: "var(--ds-accent-softer)",
          ring: "var(--ds-accent-ring)",
          fg: "var(--ds-accent-fg)",
        },
        // Signature
        amber: {
          DEFAULT: "var(--ds-amber)",
          soft: "var(--ds-amber-soft)",
          softer: "var(--ds-amber-softer)",
          fg: "var(--ds-amber-fg)",
        },
        // Semantic
        positive: {
          DEFAULT: "var(--ds-positive)",
          soft: "var(--ds-positive-soft)",
        },
        danger: {
          DEFAULT: "var(--ds-danger)",
          soft: "var(--ds-danger-soft)",
        },
        // Borders (white alpha ladder)
        edge: {
          subtle: "var(--ds-border-subtle)",
          DEFAULT: "var(--ds-border)",
          strong: "var(--ds-border-strong)",
          focus: "var(--ds-border-focus)",
        },
      },
      fontFamily: {
        display: "var(--ds-font-display)",
        sans: "var(--ds-font-sans)",
        mono: "var(--ds-font-mono)",
        editorial: "var(--ds-font-editorial)",
      },
      borderRadius: {
        sharp: "4px",
        sm: "6px",
        md: "8px",
        card: "12px",
        lg: "16px",
        xl: "20px",
        pill: "9999px",
      },
      letterSpacing: {
        tightest: "-0.05em",
        tighter: "-0.035em",
        tight: "-0.022em",
        eyebrow: "0.18em",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
        "in-out": "cubic-bezier(0.65, 0, 0.35, 1)",
      },
      transitionDuration: {
        fast: "120ms",
        base: "200ms",
        slow: "380ms",
        reveal: "600ms",
      },
      boxShadow: {
        1: "var(--ds-shadow-1)",
        2: "var(--ds-shadow-2)",
        3: "var(--ds-shadow-3)",
        glow: "var(--ds-shadow-glow)",
        "glow-amber": "var(--ds-shadow-glow-amber)",
      },
      keyframes: {
        "reveal-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "reveal-fade": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "marquee-x": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "reveal-up": "reveal-up var(--ds-duration-reveal) var(--ds-ease-out) both",
        "reveal-fade": "reveal-fade var(--ds-duration-reveal) var(--ds-ease-out) both",
        "marquee-x": "marquee-x 40s linear infinite",
        shimmer: "shimmer 2s linear infinite",
        "pulse-soft": "pulse-soft 2.4s var(--ds-ease-in-out) infinite",
      },
    },
  },
};

export default preset;

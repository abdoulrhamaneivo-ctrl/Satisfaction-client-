/**
 * Design tokens, surfaced as plain TypeScript so each app can use them in
 * arbitrary code paths (data attributes, inline styles for gradient
 * math, motion durations, etc.) without going through CSS variables.
 *
 * The CSS custom properties in `globals.css` remain the source of truth at
 * render time; this file mirrors them for compile-time consumption.
 */

export const color = {
  bg: {
    0: "#0a0b0d",
    1: "#0e1014",
    2: "#11131a",
    3: "#16181f",
    inset: "#07080a",
  },
  fg: {
    DEFAULT: "#e8eaed",
    secondary: "#9ca0a8",
    tertiary: "#6b6f77",
    quaternary: "#4d5159",
    inverse: "#0a0b0d",
  },
  accent: {
    DEFAULT: "#7c83ff",
    hover: "#8e95ff",
    pressed: "#6a72ee",
    soft: "rgba(124, 131, 255, 0.12)",
    softer: "rgba(124, 131, 255, 0.06)",
    ring: "rgba(124, 131, 255, 0.32)",
    fg: "#0a0b0d",
  },
  amber: {
    DEFAULT: "#f5b342",
    soft: "rgba(245, 179, 66, 0.12)",
    softer: "rgba(245, 179, 66, 0.06)",
    fg: "#1a1308",
  },
  positive: { DEFAULT: "#5fb878", soft: "rgba(95, 184, 120, 0.10)" },
  danger: { DEFAULT: "#f06464", soft: "rgba(240, 100, 100, 0.10)" },
  border: {
    subtle: "rgba(255, 255, 255, 0.04)",
    DEFAULT: "rgba(255, 255, 255, 0.06)",
    strong: "rgba(255, 255, 255, 0.10)",
  },
} as const;

export const font = {
  display: "var(--ds-font-display)",
  sans: "var(--ds-font-sans)",
  mono: "var(--ds-font-mono)",
  editorial: "var(--ds-font-editorial)",
} as const;

export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 32,
  8: 40,
  9: 48,
  10: 64,
  11: 80,
  12: 96,
  13: 128,
} as const;

export const radius = {
  sharp: 4,
  sm: 6,
  md: 8,
  card: 12,
  lg: 16,
  xl: 20,
  pill: 9999,
} as const;

export const motion = {
  ease: {
    out: "cubic-bezier(0.16, 1, 0.3, 1)",
    inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
  },
  duration: {
    fast: 120,
    base: 200,
    slow: 380,
    reveal: 600,
  },
} as const;

export const container = {
  prose: "36rem",
  sm: "48rem",
  md: "64rem",
  lg: "72rem",
  xl: "80rem",
} as const;

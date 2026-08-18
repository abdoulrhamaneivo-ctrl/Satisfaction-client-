# @trovy/ds — Trovy design system

Shared tokens, primitives, and Tailwind preset for the three Trovy surfaces:
`trovy-landing-page`, `trovy` (app), `trovy-admin`.

## What lives here

- **`src/tokens/`** — pure design tokens (color, type, spacing, radius, shadow, motion).
  Re-exported as plain TS so each app can consume them in `tsconfig` paths.
- **`src/primitives/`** — small, headless-on-purpose React primitives:
  `Button`, `Card`, `Badge`, `Kbd`, `Eyebrow`, `SectionHeading`, `Reveal`,
  `Container`, `Stat`, `Tag`, `Surface`, `Logo`.
- **`src/styles/globals.css`** — the single source of truth for CSS custom
  properties (`:root { --ds-* }`). Every app imports it once in its root layout.
- **`tailwind.preset.ts`** — Tailwind preset that extends each app's
  `tailwind.config.ts` with the same color scale, font families, keyframes,
  and easings.

## Direction artistique (dark editorial, Linear-like)

- **3 mots** : Précis · Dense · Raffiné
- **Palette signature** : indigo électrique `#7c83ff` + ambre chaud `#f5b342` (vs
  le lime générique) + sage `#5fb878`. Fond `#0a0b0d`, surfaces `#11131a` /
  `#16181f`.
- **Typographie** : Inter Tight display (tracking serré), Inter body, JetBrains
  Mono pour les métadonnées, Source Serif 4 en accent éditorial sur 1-2
  moments signature (intro FAQ, citations).
- **Détail distinctif** : grille de coordonnées 1px en background @ 1.5% opacity
  + `Kbd` (⌘K) omniprésent + chiffres en `tabular-nums`.

## Adding to a new app

1. **Add the dep** — in the app's `package.json`:
   ```json
   "@trovy/ds": "github:trovyhq/trovy-design-system#main"
   ```
   For local development, use `"link:../trovy-design-system"` instead and
   `pnpm install`.
2. **Import CSS once** — in the app's root layout:
   ```tsx
   import "@trovy/ds/styles/globals.css";
   ```
3. **Extend Tailwind** — in the app's `tailwind.config.ts`:
   ```ts
   import preset from "@trovy/ds/tailwind";
   export default { presets: [preset], content: ["./src/**/*.{ts,tsx}", "../trovy-design-system/src/**/*.{ts,tsx}"] };
   ```
4. **Load fonts** — apps handle their own font loading (the design system is
   font-agnostic). Recommended: `next/font/google` with the four families
   declared as CSS variables `var(--ds-font-sans)`, `var(--ds-font-display)`,
   `var(--ds-font-mono)`, `var(--ds-font-editorial)`.
5. **Consume primitives** — import from `@trovy/ds/primitives` and use the
   `cn` helper from `@trovy/ds` to merge class names.

## Naming convention

- **Tokens**: `ds-color-ink`, `ds-space-3`, `ds-radius-card`, `ds-ease-out`.
  These are CSS variables under `:root`. Tailwind also exposes them as
  `bg-ink`, `p-3`, `rounded-card`, `ease-out` via the preset.
- **Components**: PascalCase, default-exported, take `className` and
  `children`. Use `class-variance-authority` for variants.
- **No emojis in UI.** Lucide icons only.

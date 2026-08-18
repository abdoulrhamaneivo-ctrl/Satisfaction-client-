import { Moon, Sun } from "lucide-react";
import { useColorMode } from "../hooks/useColorMode";

export function DarkModeSwitcher() {
  const [colorMode, setColorMode] = useColorMode();
  const isDark = colorMode === "dark";

  const toggleTheme = () => {
    const nextMode = isDark ? "light" : "dark";
    setColorMode(nextMode);

    // Application synchrone immédiate sur les éléments racines
    const root = document.documentElement;
    const body = document.body;

    if (nextMode === "dark") {
      root.classList.add("dark");
      body.classList.add("dark");
    } else {
      root.classList.remove("dark");
      body.classList.remove("dark");
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-border/70 bg-muted/40 hover:bg-muted/80 text-foreground transition-all cursor-pointer select-none shadow-sm active:scale-95"
      title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      aria-label="Commuter le thème clair/sombre"
    >
      {isDark ? (
        <>
          <Sun className="size-4 text-amber-400 shrink-0" />
          <span className="text-[11px] font-bold text-amber-400">Sombre</span>
        </>
      ) : (
        <>
          <Moon className="size-4 text-emerald-600 shrink-0" />
          <span className="text-[11px] font-bold text-foreground">Clair</span>
        </>
      )}
    </button>
  );
}

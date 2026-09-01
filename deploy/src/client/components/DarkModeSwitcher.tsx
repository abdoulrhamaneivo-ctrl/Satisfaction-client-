import { Moon, Sun } from "lucide-react";
import { useColorMode } from "../hooks/useColorMode";

export function DarkModeSwitcher() {
  const [colorMode, setColorMode] = useColorMode();
  const isDark = colorMode === "dark";

  const toggleTheme = () => {
    const nextMode = isDark ? "light" : "dark";
    setColorMode(nextMode);

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
      className="size-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      aria-label="Commuter le thème clair/sombre"
    >
      {isDark ? (
        <Sun className="size-4" aria-hidden />
      ) : (
        <Moon className="size-4" aria-hidden />
      )}
    </button>
  );
}

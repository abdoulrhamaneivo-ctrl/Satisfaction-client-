import { useEffect, useState } from "react";

export function useColorMode() {
  const [colorMode, setColorMode] = useState<'light' | 'dark'>(() => {
    if (typeof window === "undefined") return "dark";
    try {
      const stored = localStorage.getItem("color-theme");
      if (stored === "dark" || stored === '"dark"') return "dark";
      if (stored === "light" || stored === '"light"') return "light";
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (colorMode === "dark") {
      root.classList.add("dark");
      body.classList.add("dark");
    } else {
      root.classList.remove("dark");
      body.classList.remove("dark");
    }
    try {
      localStorage.setItem("color-theme", colorMode);
    } catch (e) {
      console.error(e);
    }
  }, [colorMode]);

  return [colorMode, setColorMode] as const;
}

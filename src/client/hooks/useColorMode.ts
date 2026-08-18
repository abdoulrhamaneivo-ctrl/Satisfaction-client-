import { useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";

export function useColorMode() {
  const [colorMode, setColorMode] = useLocalStorage("color-theme", "light");

  useEffect(() => {
    const className = "dark";
    const root = window.document.documentElement;
    const body = window.document.body;

    if (colorMode === "dark") {
      root.classList.add(className);
      body.classList.add(className);
    } else {
      root.classList.remove(className);
      body.classList.remove(className);
    }
  }, [colorMode]);

  return [colorMode, setColorMode] as const;
}

import { useLayoutEffect, useState } from "react";
export function useColorMode() {
    const [colorMode, setColorMode] = useState(() => {
        if (typeof window === "undefined")
            return "light";
        try {
            const stored = localStorage.getItem("yeba-color-theme");
            if (stored === "dark" || stored === '"dark"')
                return "dark";
            if (stored === "light" || stored === '"light"')
                return "light";
            // Défaut : thème clair.
            return "light";
        }
        catch {
            return "light";
        }
    });
    // useLayoutEffect (et non useEffect) : la classe .dark est appliquée AVANT
    // le premier rendu visible, ce qui évite le flash de thème au chargement.
    useLayoutEffect(() => {
        const root = document.documentElement;
        const body = document.body;
        if (colorMode === "dark") {
            root.classList.add("dark");
            body.classList.add("dark");
        }
        else {
            root.classList.remove("dark");
            body.classList.remove("dark");
        }
        try {
            localStorage.setItem("yeba-color-theme", colorMode);
        }
        catch (e) {
            console.error(e);
        }
    }, [colorMode]);
    return [colorMode, setColorMode];
}
//# sourceMappingURL=useColorMode.js.map
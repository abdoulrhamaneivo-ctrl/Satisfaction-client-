import { Moon, Sun } from "lucide-react";
import { Switch } from "../../client/components/ui/switch";
import { useColorMode } from "../hooks/useColorMode";

export function DarkModeSwitcher() {
  const [colorMode, setColorMode] = useColorMode();
  const isInLightMode = colorMode === "light";

  return (
    <div className="flex items-center gap-2">
      <Sun className="size-4 text-muted-foreground" />
      <Switch
        aria-label="Activer le mode sombre"
        checked={!isInLightMode}
        onCheckedChange={(checked) => {
          if (typeof setColorMode === "function") {
            setColorMode(checked ? "dark" : "light");
          }
        }}
      />
      <Moon className="size-4 text-muted-foreground" />
    </div>
  );
}

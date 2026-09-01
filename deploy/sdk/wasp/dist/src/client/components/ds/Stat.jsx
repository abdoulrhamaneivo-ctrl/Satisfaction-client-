import * as React from "react";
import { cn } from "../../utils";
export function Stat({ value, label, tone = "accent", className, }) {
    const toneClass = tone === "amber"
        ? "text-secondary"
        : tone === "accent"
            ? "text-primary"
            : tone === "positive"
                ? "text-success"
                : "text-foreground";
    return (<div className={cn("p-4 sm:p-6", className)}>
      <div className={cn("font-satoshi text-3xl font-bold tracking-tight sm:text-4xl tabular-nums", toneClass)}>
        {value}
      </div>
      <div className="mt-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
    </div>);
}
//# sourceMappingURL=Stat.jsx.map
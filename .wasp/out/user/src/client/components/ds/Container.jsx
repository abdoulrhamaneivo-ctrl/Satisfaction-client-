import * as React from "react";
import { cn } from "../../utils";
export function Container({ children, size = "xl", className, }) {
    const sizeClass = size === "sm"
        ? "max-w-3xl"
        : size === "md"
            ? "max-w-5xl"
            : size === "lg"
                ? "max-w-6xl"
                : size === "xl"
                    ? "max-w-[1440px]"
                    : "max-w-full";
    return (<div className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", sizeClass, className)}>
      {children}
    </div>);
}

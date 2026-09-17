import * as React from "react";
export interface RevealProps {
    children: React.ReactNode;
    delay?: number;
    direction?: "up" | "down" | "left" | "right" | "none";
    className?: string;
    duration?: number;
}
export declare function Reveal({ children, delay, direction, className, duration, }: RevealProps): React.JSX.Element;

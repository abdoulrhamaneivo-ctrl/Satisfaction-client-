import { VariantProps } from "class-variance-authority";
import * as React from "react";
declare const cardVariants: (props?: ({
    variant?: "default" | "outer" | "inner" | "accent" | "faded" | "bento" | "bentoHighlight" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare function Card({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>): React.JSX.Element;
declare function CardHeader({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element;
declare function CardTitle({ className, ...props }: React.ComponentProps<"h3">): React.JSX.Element;
declare function CardDescription({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element;
declare function CardContent({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element;
declare function CardFooter({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element;
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, };

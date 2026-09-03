import * as React from "react";
import { cn } from "../../utils";
function Skeleton({ className, ...props }) {
    return (<div data-slot="skeleton" className={cn("animate-brand-pulse rounded-md bg-brand-green-deep/15", className)} {...props}/>);
}
export { Skeleton };
//# sourceMappingURL=skeleton.jsx.map
import * as LabelPrimitive from "@radix-ui/react-label";
import * as React from "react";
import { cn } from "../../utils";
function Label({ className, ...props }) {
    return (<LabelPrimitive.Root data-slot="label" className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props}/>);
}
export { Label };

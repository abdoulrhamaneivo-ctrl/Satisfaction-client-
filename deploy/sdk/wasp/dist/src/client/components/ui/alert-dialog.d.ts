import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import * as React from "react";
declare function AlertDialog({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Root>): React.JSX.Element;
declare function AlertDialogTrigger({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>): React.JSX.Element;
declare function AlertDialogPortal({ ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Portal>): React.JSX.Element;
declare function AlertDialogOverlay({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>): React.JSX.Element;
declare function AlertDialogContent({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Content>): React.JSX.Element;
declare function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element;
declare function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element;
declare function AlertDialogTitle({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Title>): React.JSX.Element;
declare function AlertDialogDescription({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Description>): React.JSX.Element;
declare function AlertDialogAction({ className, variant, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Action> & {
    /** "destructive" pour une action irréversible/dangereuse (suppression...). */
    variant?: "default" | "destructive";
}): React.JSX.Element;
declare function AlertDialogCancel({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>): React.JSX.Element;
export { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogOverlay, AlertDialogPortal, AlertDialogTitle, AlertDialogTrigger, };
//# sourceMappingURL=alert-dialog.d.ts.map
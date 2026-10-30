import * as ToastPrimitives from "@radix-ui/react-toast";
import { type VariantProps } from "class-variance-authority";
import * as React from "react";
declare function ToastProvider({ ...props }: React.ComponentProps<typeof ToastPrimitives.Provider>): React.JSX.Element;
declare function ToastViewport({ className, position, ...props }: React.ComponentProps<typeof ToastPrimitives.Viewport> & {
    position?: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
}): React.JSX.Element;
declare const toastVariants: (props?: ({
    variant?: "default" | "destructive" | "success" | "warning" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare function Toast({ className, variant, ...props }: React.ComponentProps<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>): React.JSX.Element;
declare function ToastAction({ className, ...props }: React.ComponentProps<typeof ToastPrimitives.Action>): React.JSX.Element;
declare function ToastClose({ className, ...props }: React.ComponentProps<typeof ToastPrimitives.Close>): React.JSX.Element;
declare function ToastTitle({ className, ...props }: React.ComponentProps<typeof ToastPrimitives.Title>): React.JSX.Element;
declare function ToastDescription({ className, ...props }: React.ComponentProps<typeof ToastPrimitives.Description>): React.JSX.Element;
type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;
type ToastActionElement = React.ReactElement<typeof ToastAction>;
export { Toast, ToastAction, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport, type ToastActionElement, type ToastProps, };

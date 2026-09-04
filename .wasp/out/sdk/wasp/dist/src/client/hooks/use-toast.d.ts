import * as React from "react";
import type { ToastActionElement, ToastProps } from "../components/ui/toast";
type ToasterToast = ToastProps & {
    id: string;
    title?: React.ReactNode;
    description?: React.ReactNode;
    action?: ToastActionElement;
};
type Action = {
    type: "ADD_TOAST";
    toast: ToasterToast;
} | {
    type: "UPDATE_TOAST";
    toast: Partial<ToasterToast>;
} | {
    type: "DISMISS_TOAST";
    toastId?: ToasterToast["id"];
} | {
    type: "REMOVE_TOAST";
    toastId?: ToasterToast["id"];
};
interface State {
    toasts: ToasterToast[];
}
export declare const reducer: (state: State, action: Action) => State;
type Toast = Omit<ToasterToast, "id">;
declare function toast({ ...props }: Toast): {
    id: string;
    dismiss: () => void;
    update: (props: ToasterToast) => void;
};
declare function useToast(): {
    toast: typeof toast;
    dismiss: (toastId?: string) => void;
    toasts: ToasterToast[];
};
export { toast, useToast };
//# sourceMappingURL=use-toast.d.ts.map
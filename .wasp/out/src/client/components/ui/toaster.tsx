import { CheckCircle2, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast";

const VARIANT_ICON = {
  default: Info,
  destructive: AlertCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
} as const;

export function Toaster({
  position,
}: {
  position?:
    | "top-left"
    | "top-center"
    | "top-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right";
}) {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const Icon = VARIANT_ICON[(variant as keyof typeof VARIANT_ICON) || "default"];
        return (
          <Toast key={id} variant={variant} {...props}>
            <Icon className="mt-0.5 size-5 shrink-0" strokeWidth={2} />
            <div className="grid flex-1 gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport position={position} />
    </ToastProvider>
  );
}

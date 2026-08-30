import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import type { ToastItem, ToastType } from "../../context/ToastContext";

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

const toastConfig: Record<
  ToastType,
  { icon: typeof CheckCircle2; bg: string; border: string; text: string; iconColor: string }
> = {
  success: {
    icon: CheckCircle2,
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-900",
    iconColor: "text-emerald-600",
  },
  error: {
    icon: AlertCircle,
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-900",
    iconColor: "text-rose-600",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-900",
    iconColor: "text-amber-600",
  },
  info: {
    icon: Info,
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-950",
    iconColor: "text-blue-600",
  },
};

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        const config = toastConfig[toast.type];
        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-lg transition-all animate-in fade-in slide-in-from-bottom-3 duration-200 ${config.bg} ${config.border}`}
          >
            <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${config.iconColor}`} />
            
            <p className={`flex-1 text-sm font-medium leading-snug ${config.text}`}>
              {toast.message}
            </p>

            <button
              type="button"
              onClick={() => onRemove(toast.id)}
              className="rounded-md p-0.5 text-gray-400 hover:bg-black/5 hover:text-gray-700 transition"
              aria-label="Cerrar notificación"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ToastContainer;
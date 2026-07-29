"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";

const ToastContext = createContext(null);

const TOAST_STYLES = {
  success: { icon: CheckCircle2, border: "border-emerald-500/30", iconColor: "text-emerald-400" },
  error: { icon: XCircle, border: "border-red-500/30", iconColor: "text-red-400" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = "success") => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => {
          const style = TOAST_STYLES[toast.type] ?? TOAST_STYLES.success;
          const Icon = style.icon;
          return (
            <div
              key={toast.id}
              className={`fade-up pointer-events-auto flex items-start gap-3 rounded-2xl border ${style.border} bg-[#111725] p-4 shadow-lg shadow-black/30`}
            >
              <Icon size={18} className={`mt-0.5 shrink-0 ${style.iconColor}`} />
              <p className="flex-1 text-sm text-white">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 text-slate-500 transition-colors hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

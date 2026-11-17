"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        removeToast(id);
      }, 3500);
    },
    [removeToast]
  );

  const success = useCallback(
    (msg: string) => addToast(msg, "success"),
    [addToast]
  );
  const error = useCallback(
    (msg: string) => addToast(msg, "error"),
    [addToast]
  );
  const info = useCallback(
    (msg: string) => addToast(msg, "info"),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info }}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-4 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-4 z-50 flex flex-col gap-2 pointer-events-none w-[90%] max-w-sm"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-[8px] border shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-all duration-150 ${
              t.type === "success"
                ? "bg-[#E8F5EC] border-[#15803D]/20 text-[#15803D]"
                : t.type === "error"
                ? "bg-[#FDECEC] border-[#B91C1C]/20 text-[#B91C1C]"
                : "bg-surface border-line text-ink"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {t.type === "success" && (
                <CheckCircle2 size={18} strokeWidth={1.75} className="shrink-0 text-success" />
              )}
              {t.type === "error" && (
                <AlertCircle size={18} strokeWidth={1.75} className="shrink-0 text-danger" />
              )}
              {t.type === "info" && (
                <Info size={18} strokeWidth={1.75} className="shrink-0 text-brand" />
              )}
              <span className="text-[14px] font-medium leading-tight">{t.message}</span>
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="p-1 -mr-1 text-current opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Close notification"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

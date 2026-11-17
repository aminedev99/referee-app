"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  showCloseButton = false,
  maxWidth = "md",
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: "md:max-w-sm",
    md: "md:max-w-md",
    lg: "md:max-w-lg",
    xl: "md:max-w-xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Flat 40% black overlay without blur */}
      <div
        className="fixed inset-0 bg-black/40 transition-opacity duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet on mobile, centered dialog on md+ */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        className={`relative z-10 w-full ${maxWidthStyles[maxWidth]} bg-surface rounded-t-[12px] md:rounded-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.06)] border border-line flex flex-col max-h-[92vh] transition-transform duration-150 ease-out`}
      >
        {/* Mobile drag handle */}
        <div className="w-full flex items-center justify-center pt-2.5 pb-1 md:hidden">
          <div className="w-9 h-1 rounded-full bg-line" />
        </div>

        {/* Header */}
        {(title || showCloseButton) && (
          <div className="px-5 pt-3 pb-2 flex items-start justify-between">
            <div>
              {title && (
                <h2 id="modal-title" className="text-[18px] font-semibold text-ink">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-[13px] text-ink-muted mt-0.5">{subtitle}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-1 -mr-1 text-ink-muted hover:text-ink rounded-[6px] transition-colors"
              >
                <X size={20} strokeWidth={1.75} />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="px-5 py-3 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

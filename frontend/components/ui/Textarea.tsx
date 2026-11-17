"use client";

import React from "react";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", error, id, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        id={id}
        className={`w-full min-h-[96px] p-3 text-[16px] bg-surface text-ink placeholder:text-ink-muted rounded-[8px] border transition-colors duration-150 ${
          error
            ? "border-danger focus:border-danger focus:ring-2 focus:ring-danger/20"
            : "border-line focus:border-brand focus:ring-2 focus:ring-brand/20"
        } outline-none disabled:bg-canvas disabled:text-ink-muted disabled:cursor-not-allowed ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

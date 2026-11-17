"use client";

import React from "react";
import { ChevronDown } from "lucide-react";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", children, error, id, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        <select
          ref={ref}
          id={id}
          className={`w-full h-12 text-[16px] bg-surface text-ink rounded-[8px] border appearance-none px-3.5 pr-10 transition-colors duration-150 ${
            error
              ? "border-danger focus:border-danger focus:ring-2 focus:ring-danger/20"
              : "border-line focus:border-brand focus:ring-2 focus:ring-brand/20"
          } outline-none disabled:bg-canvas disabled:text-ink-muted disabled:cursor-not-allowed ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-3.5 pointer-events-none text-ink-muted">
          <ChevronDown size={18} strokeWidth={1.75} />
        </div>
      </div>
    );
  }
);

Select.displayName = "Select";

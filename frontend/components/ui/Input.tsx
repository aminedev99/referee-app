"use client";

import React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", error, leftIcon, rightIcon, id, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-ink-muted">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={id}
          className={`w-full h-12 text-[16px] bg-surface text-ink placeholder:text-ink-muted rounded-[8px] border transition-colors duration-150 ${
            leftIcon ? "pl-11" : "pl-3.5"
          } ${rightIcon ? "pr-11" : "pr-3.5"} ${
            error
              ? "border-danger focus:border-danger focus:ring-2 focus:ring-danger/20"
              : "border-line focus:border-brand focus:ring-2 focus:ring-brand/20"
          } outline-none disabled:bg-canvas disabled:text-ink-muted disabled:cursor-not-allowed ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 flex items-center text-ink-muted">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

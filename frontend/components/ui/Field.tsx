"use client";

import React from "react";

export interface FieldProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Field: React.FC<FieldProps> = ({
  label,
  htmlFor,
  error,
  helperText,
  required,
  children,
  className = "",
}) => {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-[14px] font-medium text-ink flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-danger ml-0.5">*</span>}
          </span>
        </label>
      )}
      {children}
      {error && (
        <span className="text-[12px] text-danger leading-tight mt-0.5">
          {error}
        </span>
      )}
      {!error && helperText && (
        <span className="text-[12px] text-ink-muted leading-tight mt-0.5">
          {helperText}
        </span>
      )}
    </div>
  );
};

"use client";

import React from "react";

export type BadgeVariant =
  | "pending"
  | "confirmed"
  | "refused"
  | "outline"
  | "brand"
  | "neutral";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "outline",
  size = "md",
  children,
  className = "",
  ...props
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    pending: "bg-[#FEF3E2] text-[#B45309] font-medium",
    confirmed: "bg-[#E8F5EC] text-[#15803D] font-medium",
    refused: "bg-[#FDECEC] text-[#B91C1C] font-medium",
    outline: "border border-line text-ink-muted bg-surface font-normal",
    brand: "bg-[#FFF1E8] text-[#C2410C] font-medium",
    neutral: "bg-canvas text-ink-muted font-normal",
  };

  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5 rounded-[4px]",
    md: "text-[12px] px-2.5 py-0.5 rounded-[6px]",
  };

  return (
    <span
      className={`inline-flex items-center justify-center tracking-wide leading-tight select-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

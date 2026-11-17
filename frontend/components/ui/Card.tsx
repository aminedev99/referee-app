"use client";

import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  as: Component = "div",
  ...props
}) => {
  return (
    <Component
      className={`bg-surface border border-line rounded-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.06)] p-4 ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};

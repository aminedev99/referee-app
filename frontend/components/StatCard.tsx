"use client";

import React from "react";
import { Card } from "./ui/Card";

export interface StatCardProps {
  label: string;
  value: string | number;
  highlight?: "brand" | "success" | "danger" | "warning";
  className?: string;
  subtext?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  highlight,
  className = "",
  subtext,
}) => {
  const colorMap = {
    brand: "text-brand",
    success: "text-success",
    danger: "text-danger",
    warning: "text-warning",
  };

  return (
    <Card className={`p-4 flex flex-col justify-between ${className}`}>
      <span className="text-[12px] font-medium text-ink-muted">{label}</span>
      <div className="mt-1 flex items-baseline gap-2">
        <span
          className={`text-[28px] font-bold tracking-tight leading-none ${
            highlight ? colorMap[highlight] : "text-ink"
          }`}
        >
          {value}
        </span>
        {subtext && <span className="text-[12px] text-ink-muted">{subtext}</span>}
      </div>
    </Card>
  );
};

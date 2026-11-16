"use client";

import React from "react";
import { Badge } from "./ui/Badge";
import { AssignmentStatus } from "@/lib/types";

export interface StatusBadgeProps {
  status: AssignmentStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = "",
}) => {
  const labelMap: Record<AssignmentStatus, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    refused: "Refused",
  };

  return (
    <Badge variant={status} className={className}>
      {labelMap[status] || status}
    </Badge>
  );
};

export const DivisionBadge: React.FC<{
  division: string;
  className?: string;
}> = ({ division, className = "" }) => {
  return (
    <Badge variant="outline" className={`text-[11px] font-medium ${className}`}>
      {division}
    </Badge>
  );
};

export const CategoryBadge: React.FC<{
  category: string;
  className?: string;
}> = ({ category, className = "" }) => {
  return (
    <Badge variant="outline" className={`text-[11px] font-medium ${className}`}>
      {category}
    </Badge>
  );
};

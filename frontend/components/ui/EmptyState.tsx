"use client";

import React from "react";
import { Button } from "./Button";

export interface EmptyStateProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  message,
  actionLabel,
  onAction,
  icon,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-surface border border-line rounded-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.06)] ${className}`}
    >
      {icon && <div className="mb-3 text-ink-muted">{icon}</div>}
      <p className="text-[14px] text-ink-muted mb-4">{message}</p>
      {actionLabel && onAction && (
        <Button variant="secondary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export const ErrorState: React.FC<{
  message?: string;
  onRetry: () => void;
  className?: string;
}> = ({ message = "Échec du chargement des données.", onRetry, className = "" }) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-[#FDECEC] border border-danger/20 rounded-[12px] ${className}`}
    >
      <p className="text-[14px] font-medium text-danger mb-3">{message}</p>
      <Button variant="danger" size="md" onClick={onRetry}>
        Réessayer
      </Button>
    </div>
  );
};

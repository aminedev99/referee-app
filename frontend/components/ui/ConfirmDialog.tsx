"use client";

import React from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  subtitle?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  confirmLabel = "Confirmer",
  cancelLabel = "Retour",
  isDestructive = false,
  isLoading = false,
  children,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} subtitle={subtitle}>
      <div className="flex flex-col gap-4 pt-1 pb-2">
        {children}
        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant={isDestructive ? "danger" : "primary"}
            size="lg"
            fullWidth
            loading={isLoading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
          <Button
            variant="ghost"
            size="md"
            fullWidth
            disabled={isLoading}
            onClick={onClose}
          >
            {cancelLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

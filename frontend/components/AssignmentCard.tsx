"use client";

import React from "react";
import Link from "next/link";
import { MapPin, FileText, Download } from "lucide-react";
import { Assignment } from "@/lib/types";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { StatusBadge, DivisionBadge, CategoryBadge } from "./StatusBadge";

export interface AssignmentCardProps {
  assignment: Assignment;
  isRefereeView?: boolean;
  onConfirm?: (assignmentId: string) => void;
  onRefuse?: (assignmentId: string) => void;
  onGenerateReceipt?: (assignmentId: string) => void;
  onDownloadReceipt?: (assignmentId: string) => void;
  isConfirming?: boolean;
  isRefusing?: boolean;
}

export const AssignmentCard: React.FC<AssignmentCardProps> = ({
  assignment,
  isRefereeView = true,
  onConfirm,
  onRefuse,
  onGenerateReceipt,
  onDownloadReceipt,
  isConfirming = false,
  isRefusing = false,
}) => {
  const match = assignment.match;
  const isCancelled = match?.status === "cancelled";

  // Format date
  let formattedDate = "";
  if (match) {
    try {
      const d = new Date(`${match.date}T${match.time || "00:00"}`);
      if (!isNaN(d.getTime())) {
        const dayName = d.toLocaleDateString("en-GB", { weekday: "short" });
        const dayNum = d.toLocaleDateString("en-GB", { day: "numeric" });
        const month = d.toLocaleDateString("en-GB", { month: "short" });
        formattedDate = `${dayName} ${dayNum} ${month}, ${match.time}`;
      }
    } catch {
      formattedDate = `${match.date}, ${match.time}`;
    }
  }

  // Initials for avatar
  const refName = assignment.referee?.name || "Referee";
  const initials = refName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!isRefereeView) {
    // Admin Assignment Card
    return (
      <Card className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#FFF1E8] text-brand font-semibold text-[13px] flex items-center justify-center">
              {initials}
            </div>
            <div>
              <p className="text-[14px] font-semibold text-ink leading-tight">
                {refName}
              </p>
              <p className="text-[12px] text-ink-muted">
                {assignment.referee_function}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isCancelled ? (
              <span className="px-2 py-0.5 rounded-full text-[12px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                Cancelled
              </span>
            ) : (
              <StatusBadge status={assignment.status} />
            )}
            {assignment.needs_attention && (
              <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-danger/10 text-danger border border-danger/20">
                No answer
              </span>
            )}
          </div>
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <div>
            <p className="text-[14px] font-medium text-ink">
              {match ? `${match.home_team.name} vs ${match.away_team.name}` : "Match"}
            </p>
            <p className="text-[12px] text-ink-muted mt-0.5">
              {match ? `${match.venue}, ${match.city}` : ""}
            </p>
          </div>
          <span className="text-[15px] font-bold text-ink shrink-0">
            {assignment.indemnity} MAD
          </span>
        </div>

        {assignment.status === "refused" && assignment.refusal_reason && (
          <div className="bg-[#FDECEC] border border-danger/20 rounded-[8px] p-2 text-[12px] text-danger">
            Reason: {assignment.refusal_reason}
          </div>
        )}

        {!isCancelled && assignment.status === "confirmed" && (
          <div className="flex items-center gap-2 pt-2 border-t border-line">
            {!assignment.receipt ? (
              <Button
                variant="secondary"
                size="md"
                onClick={() => onGenerateReceipt?.(assignment.id)}
                className="flex-1 text-[13px]"
              >
                <FileText size={15} strokeWidth={1.75} className="mr-1.5" />
                Generate receipt
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="md"
                onClick={() => onDownloadReceipt?.(assignment.id)}
                className="flex-1 text-[13px]"
              >
                <Download size={15} strokeWidth={1.75} className="mr-1.5" />
                Download PDF
              </Button>
            )}
          </div>
        )}
      </Card>
    );
  }

  // Referee View Assignment Card (Screen 02)
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-ink-muted">
          {formattedDate}
        </span>
        <div className="flex items-center gap-1.5">
          {isCancelled ? (
            <span className="px-2 py-0.5 rounded-full text-[12px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
              Cancelled
            </span>
          ) : (
            <StatusBadge status={assignment.status} />
          )}
        </div>
      </div>

      <Link
        href={`/referee/assignments/${assignment.id}`}
        className="group block"
      >
        <h3 className="text-[16px] font-semibold text-ink group-hover:text-brand transition-colors">
          {match ? `${match.home_team.name} vs ${match.away_team.name}` : "Match"}
        </h3>
        {match && (
          <div className="flex items-center gap-1.5 text-[13px] text-ink-muted mt-1">
            <MapPin size={15} strokeWidth={1.75} className="shrink-0" />
            <span className="truncate">
              {match.venue}, {match.city}
            </span>
          </div>
        )}
      </Link>

      {match && (
        <div className="flex items-center gap-2">
          <DivisionBadge division={match.division} />
          <CategoryBadge category={match.category} />
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-line">
        <span className="text-[13px] text-ink-muted font-medium">
          {assignment.referee_function}
        </span>
        <span className="text-[16px] font-bold text-ink">
          {assignment.indemnity} MAD
        </span>
      </div>

      {!isCancelled && assignment.status === "pending" && (
        <div className="flex items-center gap-2.5 pt-1">
          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => onRefuse?.(assignment.id)}
            disabled={isRefusing || isConfirming}
          >
            Refuse
          </Button>
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => onConfirm?.(assignment.id)}
            loading={isConfirming}
            disabled={isRefusing}
          >
            Confirm
          </Button>
        </div>
      )}
    </Card>
  );
};

"use client";

import React from "react";
import { Assignment } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { Button } from "./ui/Button";
import { FileText, Download } from "lucide-react";

export interface AssignmentTableProps {
  assignments: Assignment[];
  onGenerateReceipt?: (id: string) => void;
  onDownloadReceipt?: (id: string) => void;
}

export const AssignmentTable: React.FC<AssignmentTableProps> = ({
  assignments,
  onGenerateReceipt,
  onDownloadReceipt,
}) => {
  return (
    <div className="w-full bg-surface border border-line rounded-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.06)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[14px]">
          <thead>
            <tr className="border-b border-line bg-canvas/60 text-ink-muted text-[12px] font-semibold uppercase tracking-wider">
              <th className="py-3 px-4">Referee</th>
              <th className="py-3 px-4">Match</th>
              <th className="py-3 px-4">Function</th>
              <th className="py-3 px-4">Indemnity</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-ink">
            {assignments.map((asg) => {
              const refName = asg.referee?.name || "Referee";
              const initials = refName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              const match = asg.match;
              const isCancelled = match?.status === "cancelled";

              return (
                <tr key={asg.id} className="hover:bg-canvas/40 transition-colors">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#FFF1E8] text-brand font-semibold text-[12px] flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <span className="font-medium text-ink">{refName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-ink">
                      {match ? `${match.home_team.name} vs ${match.away_team.name}` : "-"}
                    </div>
                    <div className="text-[12px] text-ink-muted">
                      {match ? `${match.date} • ${match.city}` : ""}
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-ink-muted">
                    {asg.referee_function}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-semibold">
                    {asg.indemnity} MAD
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {isCancelled ? (
                        <span className="px-2 py-0.5 rounded-full text-[12px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                          Cancelled
                        </span>
                      ) : (
                        <StatusBadge status={asg.status} />
                      )}
                      {asg.needs_attention && (
                        <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-danger/10 text-danger border border-danger/20">
                          No answer
                        </span>
                      )}
                    </div>
                    {asg.status === "refused" && asg.refusal_reason && (
                      <p className="text-[11px] text-danger mt-1 max-w-xs truncate">
                        {asg.refusal_reason}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-right">
                    {!isCancelled && asg.status === "confirmed" && (
                      <div className="flex items-center justify-end gap-1.5">
                        {!asg.receipt ? (
                          <Button
                            variant="secondary"
                            size="md"
                            onClick={() => onGenerateReceipt?.(asg.id)}
                            className="text-[12px] h-8 px-2.5"
                          >
                            <FileText size={14} className="mr-1" />
                            Receipt
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="md"
                            onClick={() => onDownloadReceipt?.(asg.id)}
                            className="text-[12px] h-8 px-2.5"
                          >
                            <Download size={14} className="mr-1" />
                            PDF
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

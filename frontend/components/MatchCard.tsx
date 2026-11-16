"use client";

import React from "react";
import Link from "next/link";
import { MapPin, Users } from "lucide-react";
import { Match } from "@/lib/types";
import { Card } from "./ui/Card";
import { DivisionBadge, CategoryBadge } from "./StatusBadge";

export interface MatchCardProps {
  match: Match;
  href?: string;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, href }) => {
  // Format date e.g. "Sat 22 Nov, 18:30"
  let formattedDate = match.date;
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

  const assignments = match.assignments || [];
  const refCount = assignments.length;
  const confirmedCount = assignments.filter((a) => a.status === "confirmed").length;
  const pendingCount = assignments.filter((a) => a.status === "pending").length;

  const content = (
    <Card className="hover:border-brand/40 transition-colors p-4 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-ink-muted">
          {formattedDate}
        </span>
        <div className="flex items-center gap-1.5">
          <DivisionBadge division={match.division} />
          <CategoryBadge category={match.category} />
        </div>
      </div>

      <h3 className="text-[16px] font-semibold text-ink">
        {match.home_team.name} vs {match.away_team.name}
      </h3>

      <div className="flex items-center gap-1.5 text-[13px] text-ink-muted">
        <MapPin size={15} strokeWidth={1.75} className="shrink-0" />
        <span className="truncate">
          {match.venue}, {match.city}
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-[12px] text-ink-muted pt-1 border-t border-line">
        <Users size={14} strokeWidth={1.75} className="shrink-0" />
        <span>
          {refCount} referee{refCount !== 1 ? "s" : ""}, {confirmedCount} confirmed
          {pendingCount > 0 ? `, ${pendingCount} pending` : ""}
        </span>
      </div>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
};

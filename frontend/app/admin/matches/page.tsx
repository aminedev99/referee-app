"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Match } from "@/lib/types";
import { Navbar } from "@/components/Navbar";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { MatchCard } from "@/components/MatchCard";
import { Button } from "@/components/ui/Button";
import { CardListSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { DivisionBadge, CategoryBadge } from "@/components/StatusBadge";

export default function AdminMatchesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");

  const {
    data: matches = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Match[]>({
    queryKey: ["admin-matches"],
    queryFn: () => api.getMatches(),
  });

  const filteredMatches = matches.filter((m) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      m.home_team.name.toLowerCase().includes(q) ||
      m.away_team.name.toLowerCase().includes(q) ||
      m.city.toLowerCase().includes(q) ||
      m.venue.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (filter === "upcoming") {
      return m.id !== "match-past-1";
    }
    if (filter === "past") {
      return m.id === "match-past-1";
    }
    return true;
  });

  return (
    <>
      <Navbar title="Matches" />

      <main className="max-w-4xl mx-auto w-full px-4 md:px-6 pt-4 flex flex-col gap-4">
        {/* Header bar on desktop */}
        <div className="hidden md:flex items-center justify-between">
          <h2 className="text-[22px] font-bold text-ink">Matches</h2>
          <Link href="/admin/matches/new">
            <Button variant="primary" size="md">
              <Plus size={16} strokeWidth={1.75} className="mr-1.5" />
              New match
            </Button>
          </Link>
        </div>

        {/* Search bar */}
        <Input
          placeholder="Search team or city"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search size={18} strokeWidth={1.75} />}
        />

        {/* Filter Pills */}
        <Tabs
          items={[
            { id: "all", label: "All" },
            { id: "upcoming", label: "Upcoming" },
            { id: "past", label: "Past" },
          ]}
          activeId={filter}
          onChange={(id) => setFilter(id as "all" | "upcoming" | "past")}
          variant="pills"
        />

        {/* Content */}
        {isLoading ? (
          <CardListSkeleton count={3} />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : filteredMatches.length === 0 ? (
          <EmptyState
            message="No matches found"
            actionLabel="Create match"
            onAction={() => router.push("/admin/matches/new")}
          />
        ) : (
          <>
            {/* Mobile View: Cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {filteredMatches.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  href={`/admin/matches/${m.id}`}
                />
              ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block bg-surface border border-line rounded-[12px] shadow-[0_1px_2px_rgba(0,0,0,0.06)] overflow-hidden">
              <table className="w-full text-left border-collapse text-[14px]">
                <thead>
                  <tr className="border-b border-line bg-canvas/60 text-ink-muted text-[12px] font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Match</th>
                    <th className="py-3 px-4">Venue</th>
                    <th className="py-3 px-4">Tags</th>
                    <th className="py-3 px-4">Referees</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink">
                  {filteredMatches.map((m) => (
                    <tr key={m.id} className="hover:bg-canvas/40 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap font-medium">
                        {m.date}, {m.time}
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        {m.home_team.name} vs {m.away_team.name}
                      </td>
                      <td className="py-3 px-4 text-ink-muted">
                        {m.venue}, {m.city}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <DivisionBadge division={m.division} />
                          <CategoryBadge category={m.category} />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-ink-muted whitespace-nowrap">
                        {m.assignments?.length || 0} assigned
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Link href={`/admin/matches/${m.id}`}>
                          <Button variant="secondary" size="md" className="h-8 px-3 text-[12px]">
                            Edit
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Mobile Floating Action Button (FAB) */}
        <Link
          href="/admin/matches/new"
          className="md:hidden fixed bottom-20 right-5 z-30 w-14 h-14 rounded-full bg-brand text-surface flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          aria-label="New match"
        >
          <Plus size={28} strokeWidth={2.5} />
        </Link>
      </main>
    </>
  );
}

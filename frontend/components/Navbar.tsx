"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar,
  Users,
  CheckSquare,
  MoreHorizontal,
  Clock,
  BarChart3,
  User as UserIcon,
  LogOut,
  ChevronRight,
  Shield,
  Layers,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { NotificationBell } from "./NotificationBell";
import { Modal } from "./ui/Modal";

export interface NavbarProps {
  title?: string;
  backHref?: string;
  hideBottomNav?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ title, backHref, hideBottomNav }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { role, logout } = useAuth();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const isAdmin = role === "admin" || pathname.startsWith("/admin");

  // Determine whether to suppress mobile bottom navigation
  const isMatchFormRoute =
    pathname === "/admin/matches/new" ||
    (pathname.startsWith("/admin/matches/") && pathname.endsWith("/edit"));
  const shouldHideBottomNav = hideBottomNav || isMatchFormRoute;

  const adminNavItems = [
    { label: "Matches", href: "/admin/matches", icon: Calendar },
    { label: "Referees", href: "/admin/referees", icon: Users },
    { label: "Assignments", href: "/admin/assignments", icon: CheckSquare },
  ];

  const refereeNavItems = [
    { label: "Assignments", href: "/referee", icon: CheckSquare },
    { label: "History", href: "/referee/history", icon: Clock },
    { label: "Stats", href: "/referee/stats", icon: BarChart3 },
    { label: "Profile", href: "/referee/profile", icon: UserIcon },
  ];

  return (
    <>
      {/* Top Mobile & Desktop App Bar (56px) */}
      <header className="sticky top-0 z-40 w-full h-14 bg-surface border-b border-line px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {backHref ? (
            <button
              type="button"
              onClick={() => router.push(backHref)}
              className="flex items-center gap-1 text-[16px] font-medium text-ink hover:text-brand cursor-pointer transition-colors"
            >
              <span className="text-brand font-semibold text-[18px]">‹</span>
              <span>{title || "Back"}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand" />
              <h1 className="text-[18px] font-semibold text-ink tracking-tight">
                {title || (isAdmin ? "Referee Manager Admin" : "Assignments")}
              </h1>
            </div>
          )}
        </div>

        {/* Referee md+ Top Navigation */}
        {!isAdmin && (
          <nav className="hidden md:flex items-center gap-6" aria-label="Referee Navigation">
            {refereeNavItems.map((item) => {
              const isActive =
                item.href === "/referee"
                  ? pathname === "/referee"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`text-[14px] font-medium transition-colors py-1 ${
                    isActive
                      ? "text-brand border-b-2 border-brand"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right side: Notification Bell & User info / Logout */}
        <div className="flex items-center gap-3">
          <NotificationBell />
          {!isAdmin && (
            <button
              type="button"
              onClick={logout}
              title="Sign out"
              aria-label="Sign out"
              className="hidden md:flex p-2 text-ink-muted hover:text-danger rounded-[8px] transition-colors"
            >
              <LogOut size={20} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </header>

      {/* Admin Desktop Sidebar (240px) */}
      {isAdmin && (
        <aside
          className="hidden md:flex fixed top-0 left-0 bottom-0 w-60 bg-surface border-r border-line flex-col z-40"
          aria-label="Admin Navigation"
        >
          {/* Logo brand */}
          <div className="h-14 px-5 border-b border-line flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#FFF1E8] flex items-center justify-center text-brand">
              <Shield size={16} strokeWidth={2} />
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-bold text-ink leading-none">Referee Manager</span>
              <span className="text-[11px] text-ink-muted leading-tight mt-0.5">Admin Workspace</span>
            </div>
          </div>

          {/* Links */}
          <div className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
            <Link
              href="/admin"
              aria-current={pathname === "/admin" ? "page" : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-[14px] font-medium transition-colors ${
                pathname === "/admin"
                  ? "bg-brand text-surface"
                  : "text-ink-muted hover:text-ink hover:bg-canvas"
              }`}
            >
              <Layers size={18} strokeWidth={1.75} />
              <span>Dashboard</span>
            </Link>

            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-[14px] font-medium transition-colors ${
                    isActive
                      ? "bg-brand text-surface"
                      : "text-ink-muted hover:text-ink hover:bg-canvas"
                  }`}
                >
                  <Icon size={18} strokeWidth={1.75} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <Link
              href="/admin/teams"
              aria-current={pathname.startsWith("/admin/teams") ? "page" : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-[14px] font-medium transition-colors ${
                pathname.startsWith("/admin/teams")
                  ? "bg-brand text-surface"
                  : "text-ink-muted hover:text-ink hover:bg-canvas"
              }`}
            >
              <Users size={18} strokeWidth={1.75} />
              <span>Teams</span>
            </Link>

            <Link
              href="/admin/profile"
              aria-current={pathname === "/admin/profile" ? "page" : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-[14px] font-medium transition-colors ${
                pathname === "/admin/profile"
                  ? "bg-brand text-surface"
                  : "text-ink-muted hover:text-ink hover:bg-canvas"
              }`}
            >
              <UserIcon size={18} strokeWidth={1.75} />
              <span>Profile</span>
            </Link>
          </div>

          {/* Footer Sign out */}
          <div className="p-3 border-t border-line">
            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-[14px] font-medium text-danger hover:bg-danger-tint transition-colors cursor-pointer"
            >
              <LogOut size={18} strokeWidth={1.75} />
              <span>Sign out</span>
            </button>
          </div>
        </aside>
      )}

      {/* Fixed Bottom Tab Bar on Mobile (64px) - hidden on full-screen form routes */}
      {!shouldHideBottomNav && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-line flex items-center justify-around z-40"
          aria-label="Mobile Bottom Navigation"
        >
          {isAdmin ? (
            <>
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium transition-colors ${
                      isActive ? "text-brand" : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    <Icon size={20} strokeWidth={1.75} />
                    <span className="mt-1">{item.label}</span>
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => setIsMoreOpen(true)}
                aria-expanded={isMoreOpen}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium cursor-pointer transition-colors ${
                  isMoreOpen ? "text-brand" : "text-ink-muted hover:text-ink"
                }`}
              >
                <MoreHorizontal size={20} strokeWidth={1.75} />
                <span className="mt-1">More</span>
              </button>
            </>
          ) : (
            <>
              {refereeNavItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/referee"
                    ? pathname === "/referee"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium transition-colors ${
                      isActive ? "text-brand" : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    <Icon size={20} strokeWidth={1.75} />
                    <span className="mt-1">{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>
      )}

      {/* Admin "More" Mobile Sheet */}
      {isAdmin && (
        <Modal
          isOpen={isMoreOpen}
          onClose={() => setIsMoreOpen(false)}
          title="More options"
        >
          <div className="flex flex-col py-2 divide-y divide-line">
            <Link
              href="/admin/teams"
              onClick={() => setIsMoreOpen(false)}
              className="py-3.5 flex items-center justify-between text-ink hover:text-brand transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users size={20} strokeWidth={1.75} className="text-ink-muted" />
                <span className="text-[15px] font-medium">Teams</span>
              </div>
              <ChevronRight size={18} strokeWidth={1.75} className="text-ink-muted" />
            </Link>

            <Link
              href="/admin"
              onClick={() => setIsMoreOpen(false)}
              className="py-3.5 flex items-center justify-between text-ink hover:text-brand transition-colors"
            >
              <div className="flex items-center gap-3">
                <Layers size={20} strokeWidth={1.75} className="text-ink-muted" />
                <span className="text-[15px] font-medium">Dashboard</span>
              </div>
              <ChevronRight size={18} strokeWidth={1.75} className="text-ink-muted" />
            </Link>

            <Link
              href="/admin/profile"
              onClick={() => setIsMoreOpen(false)}
              className="py-3.5 flex items-center justify-between text-ink hover:text-brand transition-colors"
            >
              <div className="flex items-center gap-3">
                <UserIcon size={20} strokeWidth={1.75} className="text-ink-muted" />
                <span className="text-[15px] font-medium">Profile</span>
              </div>
              <ChevronRight size={18} strokeWidth={1.75} className="text-ink-muted" />
            </Link>

            <button
              type="button"
              onClick={() => {
                setIsMoreOpen(false);
                logout();
              }}
              className="py-3.5 flex items-center gap-3 text-danger hover:opacity-80 transition-opacity text-left cursor-pointer"
            >
              <LogOut size={20} strokeWidth={1.75} />
              <span className="text-[15px] font-medium">Sign out</span>
            </button>
          </div>
        </Modal>
      )}
    </>
  );
};

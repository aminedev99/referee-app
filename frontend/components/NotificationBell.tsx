"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Notification } from "@/lib/types";

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => api.getNotifications(),
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllMutation = useMutation({
    mutationFn: () => api.markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications (${unreadCount} non lues)`}
        className="relative p-2 rounded-[8px] text-ink hover:bg-canvas transition-colors duration-150 cursor-pointer"
      >
        <Bell size={22} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-brand rounded-full ring-2 ring-surface" />
        )}
      </button>

      {/* Mobile Bottom Sheet & md+ Dropdown */}
      {isOpen && (
        <>
          {/* Mobile Overlay */}
          <div
            className="fixed inset-0 bg-black/40 z-50 md:hidden transition-opacity"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Container: Bottom sheet on mobile, Popover dropdown on md+ */}
          <div className="fixed inset-x-0 bottom-0 z-50 md:absolute md:inset-auto md:right-0 md:top-full md:mt-2 w-full md:w-96 bg-surface rounded-t-[12px] md:rounded-[12px] border border-line shadow-[0_1px_2px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col max-h-[85vh] md:max-h-[480px]">
            {/* Drag handle on mobile */}
            <div className="w-full flex items-center justify-center pt-2.5 pb-1 md:hidden">
              <div className="w-9 h-1 rounded-full bg-line" />
            </div>

            {/* Header */}
            <div className="px-4 py-3 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-[16px] font-semibold text-ink">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-[12px] font-medium bg-[#FFF1E8] text-brand px-2 py-0.5 rounded-full">
                    {unreadCount} nouvelle{unreadCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllMutation.mutate()}
                  className="text-[13px] font-medium text-brand hover:text-brand-hover transition-colors cursor-pointer"
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto divide-y divide-line py-1">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-[14px] text-ink-muted">
                  Aucune notification
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.read) markOneMutation.mutate(n.id);
                    }}
                    className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                      n.read ? "bg-surface opacity-80" : "bg-[#FFF1E8]/30 hover:bg-[#FFF1E8]/50"
                    }`}
                  >
                    <div className="mt-1.5 shrink-0">
                      {n.type === "refused" ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-danger" />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-brand" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[14px] font-semibold text-ink truncate">
                          {n.title}
                        </p>
                        <span className="text-[12px] text-ink-muted shrink-0">
                          {n.created_at}
                        </span>
                      </div>
                      <p className="text-[13px] text-ink-muted truncate">
                        {n.description}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

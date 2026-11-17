"use client";

import React from "react";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: "underline" | "pills";
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeId,
  onChange,
  variant = "underline",
  className = "",
}) => {
  if (variant === "pills") {
    return (
      <div
        className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 ${className}`}
        role="tablist"
      >
        {items.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={`px-3 py-1.5 rounded-[8px] text-[13px] font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                isActive
                  ? "bg-brand text-surface"
                  : "bg-surface border border-line text-ink-muted hover:text-ink"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`ml-1.5 text-[11px] px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-brand-hover text-surface" : "bg-canvas text-ink-muted"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center border-b border-line gap-4 sm:gap-6 overflow-x-auto no-scrollbar ${className}`}
      role="tablist"
    >
      {items.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`pb-2.5 pt-1 text-[14px] whitespace-nowrap font-medium transition-colors duration-150 relative cursor-pointer ${
              isActive
                ? "text-brand border-b-2 border-brand font-semibold"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`ml-1.5 text-[12px] ${
                  isActive ? "text-brand" : "text-ink-muted"
                }`}
              >
                ({tab.count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

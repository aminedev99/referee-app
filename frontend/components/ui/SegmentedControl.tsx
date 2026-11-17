"use client";

import React from "react";

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  name?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className = "",
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`grid grid-cols-${options.length} bg-canvas p-1 rounded-[8px] border border-line gap-1 w-full ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={`h-9 px-3 text-[14px] font-medium rounded-[6px] transition-colors duration-150 cursor-pointer text-center truncate ${
              isSelected
                ? "bg-brand text-surface shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                : "text-ink-muted hover:text-ink bg-transparent"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

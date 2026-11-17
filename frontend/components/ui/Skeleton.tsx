"use client";

import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string;
  height?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  width,
  height,
  style,
  ...props
}) => {
  return (
    <div
      className={`bg-line/70 rounded-[6px] ${className}`}
      style={{
        width,
        height,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
};

export const CardListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="flex flex-col gap-3 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 bg-surface border border-line rounded-[12px] flex flex-col gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-56" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-14" />
          </div>
        </div>
      ))}
    </div>
  );
};

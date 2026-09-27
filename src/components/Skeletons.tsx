import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton ${className}`} aria-hidden="true" />
);

/** Four summary-stat tiles (Tejas Command overview). */
export const StatsSkeleton: React.FC = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className="glass-card p-4 flex flex-col gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-14" />
      </div>
    ))}
  </div>
);

/** Rows of list cards (ranked segments, tables). */
export const ListSkeleton: React.FC<{ rows?: number }> = ({ rows = 6 }) => (
  <div className="space-y-2.5">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="glass-card p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-12 rounded-full" />
        </div>
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-1 w-full rounded-full" />
      </div>
    ))}
  </div>
);

/** Full-page centered skeleton (route-level loads, public brief). */
export const PageSkeleton: React.FC = () => (
  <div className="min-h-screen bg-navy-900 text-white flex items-center justify-center p-4">
    <div className="glass-card max-w-md w-full p-6 space-y-4">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-24 w-full" />
    </div>
  </div>
);

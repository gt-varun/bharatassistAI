import React from 'react';
import { Skeleton } from './skeleton';

export interface LoadingStateProps {
  message?: string;
  /** How many record placeholders to show. */
  rows?: number;
}

/**
 * Loading mirrors the shape of the records that are about to arrive, so the
 * page does not jump when they do.
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Searching the scheme register',
  rows = 3
}) => (
  <div className="space-y-4" role="status" aria-live="polite">
    <p className="register-strong flex items-center gap-2">
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-sanction" />
      {message}
    </p>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="record p-5">
        <div className="space-y-3 pl-1">
          <div className="flex gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

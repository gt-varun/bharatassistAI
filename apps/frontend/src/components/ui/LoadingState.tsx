import React from 'react';
import { Skeleton } from './skeleton.js';

export interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4 w-full">
      <Skeleton className="h-8 w-48 bg-slate-700" />
      <Skeleton className="h-4 w-64 bg-slate-700" />
      <Skeleton className="h-24 w-full bg-slate-700/60" />
      <span className="text-xs text-muted-foreground font-medium animate-pulse">{message}</span>
    </div>
  );
};

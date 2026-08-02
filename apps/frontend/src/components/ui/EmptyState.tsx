import React from 'react';
import { SearchX } from 'lucide-react';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No results found',
  description = 'Try adjusting your filters or search terms.',
  action
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 bg-slate-800/50 border border-slate-700/50 rounded-xl text-center">
      <div className="p-3 bg-slate-800 rounded-full text-gray-400 mb-3">
        <SearchX className="w-8 h-8" />
      </div>
      <h4 className="text-lg font-semibold text-white mb-1">{title}</h4>
      <p className="text-sm text-gray-400 max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
};

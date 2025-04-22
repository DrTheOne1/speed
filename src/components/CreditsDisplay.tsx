import React from 'react';
import { useCredits } from '../hooks/useCredits';
import { Loader2 } from 'lucide-react';

interface CreditsDisplayProps {
  showAddButton?: boolean;
  className?: string;
}

export function CreditsDisplay({ showAddButton = false, className = '' }: CreditsDisplayProps) {
  const { credits, loading } = useCredits();

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading credits...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="font-medium">Credits:</span>
      <span className="font-bold text-indigo-600">{credits}</span>
      {showAddButton && (
        <button
          onClick={() => window.location.href = '/buy-credits'}
          className="ml-2 text-sm text-indigo-600 hover:text-indigo-700"
        >
          Buy More
        </button>
      )}
    </div>
  );
} 
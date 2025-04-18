import React from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  className?: string;
}

export default function Tooltip({ text, children, className = '' }: TooltipProps) {
  return (
    <div className={`relative group ${className}`}>
      {children}
      <div className="absolute invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity bottom-full left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap mb-2 z-50">
        {text}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
} 
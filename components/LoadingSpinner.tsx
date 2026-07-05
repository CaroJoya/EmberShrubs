// components/LoadingSpinner.tsx
'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text = 'Generating your assignment...',
}) => {
  const sizeClass = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }[size];

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Loader2 className={`${sizeClass} text-primary-600 animate-spin`} />
      {text && <p className="mt-3 text-sm text-slate-600">{text}</p>}
    </div>
  );
};
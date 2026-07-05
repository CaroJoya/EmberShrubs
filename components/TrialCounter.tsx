// components/TrialCounter.tsx
'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

interface TrialCounterProps {
  remainingTrials: number;
  maxTrials?: number;
}

export const TrialCounter: React.FC<TrialCounterProps> = ({
  remainingTrials,
  maxTrials = 5,
}) => {
  const percentage = (remainingTrials / maxTrials) * 100;
  const isLow = remainingTrials <= 1;
  const isExhausted = remainingTrials <= 0;

  return (
    <div className="inline-flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
      <Sparkles className={`w-4 h-4 ${isExhausted ? 'text-red-500' : 'text-yellow-500'}`} />
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${isExhausted ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-slate-700'}`}>
          {isExhausted ? 'No free trials left' : `${remainingTrials} free generations remaining`}
        </span>
        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isExhausted ? 'bg-red-500' : isLow ? 'bg-orange-500' : 'bg-primary-500'
            }`}
            style={{ width: `${Math.max(0, percentage)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
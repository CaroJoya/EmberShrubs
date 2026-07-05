// components/TrialCounter.tsx
'use client';

import React from 'react';
import { Sparkles, AlertTriangle } from 'lucide-react';

interface TrialCounterProps {
  remainingTrials: number;
  maxTrials?: number;
}

export const TrialCounter: React.FC<TrialCounterProps> = ({
  remainingTrials,
  maxTrials = 5,
}) => {
  const percentage = Math.min((remainingTrials / maxTrials) * 100, 100);
  const isLow = remainingTrials <= 1;
  const isExhausted = remainingTrials <= 0;

  if (isExhausted) {
    return (
      <div className="inline-flex items-center gap-3 bg-red-50 px-4 py-2 rounded-full border border-red-200 shadow-sm">
        <AlertTriangle className="w-4 h-4 text-red-500" />
        <span className="text-sm font-medium text-red-600">
          No free trials left
        </span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
      <Sparkles className={`w-4 h-4 ${isLow ? 'text-orange-500' : 'text-yellow-500'}`} />
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${isLow ? 'text-orange-600' : 'text-slate-700'}`}>
          {remainingTrials} free {remainingTrials === 1 ? 'generation' : 'generations'} remaining
        </span>
        <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isLow ? 'bg-orange-500' : 'bg-primary-500'
            }`}
            style={{ width: `${Math.max(0, percentage)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
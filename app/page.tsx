// app/page.tsx
'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GenerateForm } from '@/components/GenerateForm';
import { ResultDisplay } from '@/components/ResultDisplay';
import { Navbar } from '@/components/Navbar';
import { TrialCounter } from '@/components/TrialCounter';

export default function Home() {
  const { user, isPremium, remainingTrials, loading } = useAuth();
  const [generationResult, setGenerationResult] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (prompt: string, language: string, experimentNumber?: string, title?: string) => {
    setIsGenerating(true);
    setError(null);
    setGenerationResult(null);

    try {
      // Get guest fingerprint if not logged in
      let guestFingerprint = null;
      if (!user) {
        guestFingerprint = localStorage.getItem('guestFingerprint');
        if (!guestFingerprint) {
          // Simple fingerprint generation
          const ua = window.navigator.userAgent;
          const screen = `${window.screen.width}x${window.screen.height}`;
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const str = `${ua}|${screen}|${timezone}`;
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
          }
          guestFingerprint = `guest_${Math.abs(hash)}`;
          localStorage.setItem('guestFingerprint', guestFingerprint);
        }
      }

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.uid || '',
          'x-guest-fingerprint': guestFingerprint || '',
        },
        body: JSON.stringify({ prompt, language, experimentNumber, title }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      setGenerationResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAnother = () => {
    setGenerationResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <main className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
            EmberShrubs
          </h1>
          <p className="mt-2 text-lg text-slate-600">
            Generate your assignment in seconds
          </p>
        </div>

        {/* Trial Counter */}
        {!isPremium && !generationResult && (
          <div className="mb-6 flex justify-center">
            <TrialCounter remainingTrials={remainingTrials} />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Generation Form */}
        {!generationResult && (
          <GenerateForm
            onSubmit={handleGenerate}
            isLoading={isGenerating}
            isPremium={isPremium}
          />
        )}

        {/* Result Display */}
        {generationResult && generationResult.success && (
          <ResultDisplay
            code={generationResult.data.code}
            image={generationResult.data.image}
            experimentNumber={generationResult.data.experimentNumber}
            title={generationResult.data.title}
            language={generationResult.data.language}
            fileData={generationResult.data.fileData}
            fileName={generationResult.data.fileName}
            remainingTrials={generationResult.remainingTrials}
            isPremium={generationResult.isPremium}
            onGenerateAnother={handleGenerateAnother}
          />
        )}

        {/* Premium Status */}
        {isPremium && generationResult && (
          <div className="mt-6 text-center">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              ✨ Premium User - Unlimited Generations
            </span>
          </div>
        )}
      </main>
    </div>
  );
}
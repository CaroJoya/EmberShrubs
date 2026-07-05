// app/generate/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { GenerateForm } from '@/components/GenerateForm';
import { ResultDisplay } from '@/components/ResultDisplay';
import { TrialCounter } from '@/components/TrialCounter';
import { useGuest } from '@/lib/hooks/useGuest';
import { Loader2 } from 'lucide-react';

export default function GeneratePage() {
  const router = useRouter();
  const { user, isPremium, remainingTrials: userRemainingTrials, loading: authLoading, refreshUser } = useAuth();
  const { fingerprint, remainingTrials: guestRemainingTrials, loading: guestLoading } = useGuest();
  const [generationResult, setGenerationResult] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localRemainingTrials, setLocalRemainingTrials] = useState<number>(5);
  const [userType, setUserType] = useState<'premium' | 'free' | 'guest' | 'api-key'>('guest');
  const [userApiKey, setUserApiKey] = useState<string | null>(null);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  // Load API key from localStorage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('userApiKey');
    if (storedKey) {
      setUserApiKey(storedKey);
    }
  }, []);

  // Determine which remaining trials to show
  useEffect(() => {
    if (user) {
      // Check if user has stored API key
      const storedKey = localStorage.getItem('userApiKey');
      if (storedKey) {
        setUserType('api-key');
        setLocalRemainingTrials(Infinity);
        return;
      }
      
      setLocalRemainingTrials(userRemainingTrials);
      setUserType(isPremium ? 'premium' : 'free');
    } else if (fingerprint) {
      // Check if guest has stored API key
      const storedKey = localStorage.getItem('userApiKey');
      if (storedKey) {
        setUserType('api-key');
        setLocalRemainingTrials(Infinity);
        return;
      }
      setLocalRemainingTrials(guestRemainingTrials);
      setUserType('guest');
    }
  }, [user, isPremium, userRemainingTrials, fingerprint, guestRemainingTrials]);

  const handleGenerate = async (prompt: string, language: string, experimentNumber?: string, title?: string) => {
    setIsGenerating(true);
    setError(null);
    setGenerationResult(null);

    try {
      // Get guest fingerprint if not logged in
      let guestFingerprint = null;
      if (!user) {
        guestFingerprint = fingerprint;
      }

      // Get API key from localStorage if available
      const apiKey = localStorage.getItem('userApiKey');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (user?.uid) {
        headers['x-user-id'] = user.uid;
      }
      if (guestFingerprint) {
        headers['x-guest-fingerprint'] = guestFingerprint;
      }
      if (apiKey) {
        headers['x-user-api-key'] = apiKey;
      }

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt, language, experimentNumber, title }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      setGenerationResult(data);
      
      // Update local trial count
      if (data.remainingTrials !== undefined) {
        setLocalRemainingTrials(data.remainingTrials);
      }
      if (data.userType) {
        setUserType(data.userType);
      }

      // Refresh user data if logged in
      if (user) {
        await refreshUser();
      }
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

  const isLoading = authLoading || guestLoading;

  const isUnlimited = userType === 'premium' || userType === 'api-key';

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  // If not logged in, show nothing (redirecting)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
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
        {!isLoading && !isUnlimited && !generationResult && (
          <div className="mb-6 flex justify-center">
            <TrialCounter 
              remainingTrials={localRemainingTrials} 
              maxTrials={5}
            />
          </div>
        )}

        {/* Premium/API Key Status */}
        {!isLoading && isUnlimited && !generationResult && (
          <div className="mb-6 flex justify-center">
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full border border-green-200">
              <span className="text-sm font-medium">
                {userType === 'premium' ? '✨ Premium User - Unlimited Generations' : '🔑 Using Your Own API Key - Unlimited'}
              </span>
            </div>
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
            isPremium={isUnlimited}
            remainingTrials={localRemainingTrials}
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
            isPremium={generationResult.isPremium || generationResult.userType === 'api-key'}
            onGenerateAnother={handleGenerateAnother}
          />
        )}

        {/* Trial Expired Notice */}
        {!isLoading && !generationResult && localRemainingTrials === 0 && !isUnlimited && (
          <div className="mt-6 p-6 bg-red-50 border border-red-200 rounded-lg text-center">
            <h3 className="text-lg font-semibold text-red-800 mb-2">No Free Trials Left</h3>
            <p className="text-red-600 mb-4">
              You've used all {5} free generations. 
              {!user ? ' Sign in to get more trials or use your own API key.' : ' Upgrade to premium or use your own API key for unlimited generations.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {!user && (
                <button
                  onClick={() => router.push('/auth')}
                  className="btn-primary"
                >
                  Sign In
                </button>
              )}
              <button
                onClick={() => {
                  // Show API key input
                  const apiKeyInput = document.querySelector<HTMLInputElement>('[data-api-key-input]');
                  if (apiKeyInput) {
                    apiKeyInput.classList.toggle('hidden');
                    apiKeyInput.focus();
                  }
                }}
                className="btn-secondary"
              >
                Enter Your Own API Key
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
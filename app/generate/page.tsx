// app/generate/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useGuest } from '@/lib/hooks/useGuest';
import { GenerateForm } from '@/components/GenerateForm';
import { ResultDisplay } from '@/components/ResultDisplay';
import { ApiKeyManager } from '@/components/ApiKeyManager';
import { TrialCounter } from '@/components/TrialCounter';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function GeneratePage() {
  const router = useRouter();
  const { user, firebaseUser, loading: authLoading, isPremium, remainingTrials: userRemainingTrials, refreshUser } = useAuth();
  const { fingerprint, remainingTrials: guestRemainingTrials, loading: guestLoading } = useGuest();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Check if user has their own API key stored
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('userApiKey');
      setHasApiKey(!!stored);
    }
  }, []);

  // Redirect if not authenticated (but allow guests)
  useEffect(() => {
    if (!authLoading && !user && !fingerprint) {
      if (!fingerprint) {
        router.push('/auth');
      }
    }
  }, [user, authLoading, fingerprint, router]);

  const handleGenerate = useCallback(async (prompt: string, language: string, experimentNumber?: string, title?: string) => {
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const storedApiKey = typeof window !== 'undefined' ? localStorage.getItem('userApiKey') : null;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // ✅ Use firebaseUser for authentication
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
          headers['x-user-id'] = firebaseUser.uid;
          console.log('✅ User authenticated with token');
        } catch (tokenError) {
          console.error('Failed to get ID token:', tokenError);
          throw new Error('Authentication failed. Please sign out and sign in again.');
        }
      } else if (fingerprint) {
        headers['x-guest-fingerprint'] = fingerprint;
        console.log('✅ Guest authenticated with fingerprint');
      } else {
        throw new Error('No user or guest identifier found');
      }

      if (storedApiKey) {
        headers['x-user-api-key'] = storedApiKey;
        console.log('✅ Using stored API key');
      }

      console.log('🚀 Sending request to /api/generate');
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          prompt, 
          language, 
          experimentNumber, 
          title,
        }),
      });

      const data = await response.json();
      console.log('📦 Response status:', response.status);
      console.log('📦 Response data:', data);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please sign out and sign in again.');
        }
        if (response.status === 404) {
          throw new Error('User not found. Please sign out and sign in again.');
        }
        throw new Error(data.error || 'Failed to generate assignment');
      }

      if (!data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      setResult(data.data);
      
      if (user) {
        await refreshUser();
      }
      
    } catch (err) {
      console.error('❌ Generate error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsGenerating(false);
    }
  }, [firebaseUser, user, fingerprint, refreshUser]);

  const handleGenerateAnother = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  // Show loading state
  if (authLoading || guestLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (!user && !fingerprint) {
    return null;
  }

  const effectiveRemainingTrials = user ? userRemainingTrials : guestRemainingTrials;
  const isUnlimited = isPremium || hasApiKey;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Generate Assignment</h1>
          <p className="text-slate-600 mt-1">
            Describe your program and get a complete assignment with code and output.
          </p>
        </div>

        {!isUnlimited && (
          <div className="mb-6">
            <TrialCounter 
              remainingTrials={typeof effectiveRemainingTrials === 'number' ? effectiveRemainingTrials : 5}
              maxTrials={5}
            />
          </div>
        )}

        <div className="mb-6">
          <ApiKeyManager />
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {result ? (
          <ResultDisplay
            code={result.code}
            image={result.image}
            experimentNumber={result.experimentNumber || '1'}
            title={result.title || ''}
            language={result.language}
            fileData={result.fileData}
            fileName={result.fileName}
            remainingTrials={typeof effectiveRemainingTrials === 'number' ? effectiveRemainingTrials : 5}
            isPremium={isPremium || hasApiKey}
            onGenerateAnother={handleGenerateAnother}
          />
        ) : (
          <GenerateForm
            onSubmit={handleGenerate}
            isLoading={isGenerating}
            isPremium={isPremium || hasApiKey}
            remainingTrials={typeof effectiveRemainingTrials === 'number' ? effectiveRemainingTrials : 5}
          />
        )}
      </div>
    </div>
  );
}
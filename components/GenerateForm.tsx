// components/GenerateForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Send, Loader2, Key, Check, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface GenerateFormProps {
  onSubmit: (prompt: string, language: string, experimentNumber?: string, title?: string) => void;
  isLoading: boolean;
  isPremium: boolean;
  remainingTrials?: number;
}

const LANGUAGES = ['C', 'Python', 'Java', 'C++'];

export const GenerateForm: React.FC<GenerateFormProps> = ({
  onSubmit,
  isLoading,
  isPremium,
  remainingTrials = 5,
}) => {
  const { user, refreshUser } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState('C');
  const [experimentNumber, setExperimentNumber] = useState('');
  const [title, setTitle] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);
  const [savedApiKey, setSavedApiKey] = useState<string | null>(null);
  const [isUsingOwnApiKey, setIsUsingOwnApiKey] = useState(false);

  // Check if user has API key stored
  useEffect(() => {
    const checkStoredApiKey = () => {
      const stored = localStorage.getItem('userApiKey');
      if (stored) {
        setSavedApiKey(stored);
        setIsUsingOwnApiKey(true);
        setShowApiKeyInput(false);
      } else {
        setSavedApiKey(null);
        setIsUsingOwnApiKey(false);
      }
    };

    checkStoredApiKey();
    // Listen for storage changes
    window.addEventListener('storage', checkStoredApiKey);
    return () => window.removeEventListener('storage', checkStoredApiKey);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    onSubmit(prompt.trim(), language, experimentNumber || undefined, title || undefined);
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return;
    setIsSavingApiKey(true);
    try {
      // Store API key in localStorage
      localStorage.setItem('userApiKey', apiKey.trim());
      setSavedApiKey(apiKey.trim());
      setIsUsingOwnApiKey(true);
      setShowApiKeyInput(false);
      setApiKey('');
      
      // If user is logged in, we could also store in Firebase
      // But for Phase 6, localStorage is sufficient
      
      // Refresh user data to update UI
      if (user) {
        await refreshUser();
      }
      
      // Show success feedback
      alert('API key saved successfully! You now have unlimited generations.');
      
      // Reload to apply changes
      window.location.reload();
    } catch (error) {
      console.error('Error saving API key:', error);
      alert('Failed to save API key. Please try again.');
    } finally {
      setIsSavingApiKey(false);
    }
  };

  const handleRemoveApiKey = () => {
    if (confirm('Remove your saved API key? You will lose unlimited access.')) {
      localStorage.removeItem('userApiKey');
      setSavedApiKey(null);
      setIsUsingOwnApiKey(false);
      // Reload to apply changes
      window.location.reload();
    }
  };

  const hasTrialsLeft = remainingTrials > 0 || isPremium || isUsingOwnApiKey;
  const isUnlimited = isPremium || isUsingOwnApiKey;

  return (
    <form onSubmit={handleSubmit} className="card">
      {/* Prompt Input */}
      <div className="mb-4">
        <label htmlFor="prompt" className="block text-sm font-medium text-slate-700 mb-1">
          Describe your program
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., Write a C program to reverse a linked list"
          className="input-field min-h-[100px] resize-y"
          disabled={isLoading || !hasTrialsLeft}
          required
        />
        <p className="mt-1 text-xs text-slate-500">
          {prompt.length}/500 characters
        </p>
      </div>

      {/* Language Selector */}
      <div className="mb-4">
        <label htmlFor="language" className="block text-sm font-medium text-slate-700 mb-1">
          Language
        </label>
        <select
          id="language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="input-field"
          disabled={isLoading || !hasTrialsLeft}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div>

      {/* Advanced Options Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-sm text-primary-600 hover:text-primary-700 mb-4"
        disabled={isLoading || !hasTrialsLeft}
      >
        {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
      </button>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="space-y-4 mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div>
            <label htmlFor="experimentNumber" className="block text-sm font-medium text-slate-700 mb-1">
              Experiment Number (Optional)
            </label>
            <input
              id="experimentNumber"
              type="text"
              value={experimentNumber}
              onChange={(e) => setExperimentNumber(e.target.value)}
              placeholder="e.g., 1, 2, 3..."
              className="input-field"
              disabled={isLoading || !hasTrialsLeft}
            />
          </div>
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
              Title (Optional)
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Reverse a Linked List"
              className="input-field"
              disabled={isLoading || !hasTrialsLeft}
            />
          </div>
        </div>
      )}

      {/* Own API Key Section */}
      {!isUsingOwnApiKey ? (
        <button
          type="button"
          onClick={() => setShowApiKeyInput(!showApiKeyInput)}
          className="text-sm text-secondary-600 hover:text-secondary-700 mb-4 flex items-center gap-1"
          disabled={isLoading}
        >
          <Key className="w-4 h-4" />
          {showApiKeyInput ? 'Hide' : 'Enter Your Own Gemini API Key'}
        </button>
      ) : (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700 font-medium">Using your own API key (Unlimited)</span>
          </div>
          <button
            type="button"
            onClick={handleRemoveApiKey}
            className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Remove
          </button>
        </div>
      )}

      {/* API Key Input */}
      {showApiKeyInput && !isUsingOwnApiKey && (
        <div className="mb-4 p-4 bg-secondary-50 rounded-lg border border-secondary-200">
          <label htmlFor="apiKey" className="block text-sm font-medium text-slate-700 mb-1">
            Your Gemini API Key
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your Gemini API key here..."
              className="input-field flex-1"
              disabled={isSavingApiKey}
              data-api-key-input
            />
            <button
              type="button"
              onClick={handleSaveApiKey}
              disabled={isSavingApiKey || !apiKey.trim()}
              className="btn-secondary whitespace-nowrap"
            >
              {isSavingApiKey ? 'Saving...' : 'Save Key'}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Your API key will be stored locally in your browser and used for all generations.
            {user ? ' It will also be associated with your account.' : ' Sign in to save it permanently.'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Get your API key from{' '}
            <a 
              href="https://ai.google.dev/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline"
            >
              Google AI Studio
            </a>
          </p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || !prompt.trim() || !hasTrialsLeft}
        className="w-full btn-primary flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            Generate Assignment
          </>
        )}
      </button>

      {/* Status Messages */}
      {!isUnlimited && hasTrialsLeft && (
        <p className="mt-3 text-sm text-slate-500 text-center">
          {remainingTrials} free {remainingTrials === 1 ? 'generation' : 'generations'} remaining
        </p>
      )}

      {isUnlimited && (
        <p className="mt-3 text-sm text-green-600 text-center flex items-center justify-center gap-1">
          <Check className="w-4 h-4" />
          {isPremium ? '✨ Premium - Unlimited generations' : '🔑 Using your own API key - Unlimited'}
        </p>
      )}

      {!isUnlimited && !hasTrialsLeft && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 text-center">
          No free trials left. Sign in or use your own API key to continue.
        </div>
      )}
    </form>
  );
};
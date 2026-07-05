// components/GenerateForm.tsx
'use client';

import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface GenerateFormProps {
  onSubmit: (prompt: string, language: string, experimentNumber?: string, title?: string) => void;
  isLoading: boolean;
  isPremium: boolean;
}

const LANGUAGES = ['C', 'Python', 'Java', 'C++'];

export const GenerateForm: React.FC<GenerateFormProps> = ({
  onSubmit,
  isLoading,
  isPremium,
}) => {
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState('C');
  const [experimentNumber, setExperimentNumber] = useState('');
  const [title, setTitle] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    onSubmit(prompt.trim(), language, experimentNumber || undefined, title || undefined);
  };

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
          disabled={isLoading}
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
          disabled={isLoading}
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
              disabled={isLoading}
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
              disabled={isLoading}
            />
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || !prompt.trim()}
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

      {/* Free Trial Info */}
      {!isPremium && (
        <p className="mt-3 text-sm text-slate-500 text-center">
          Free trial limit: 5 generations
        </p>
      )}
    </form>
  );
};
// components/ApiKeyManager.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Key, Check, X, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGuest } from '@/lib/hooks/useGuest';

export const ApiKeyManager: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { fingerprint } = useGuest();
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Check if user has stored API key
  useEffect(() => {
    const checkStoredKey = () => {
      const stored = localStorage.getItem('userApiKey');
      setHasStoredKey(!!stored);
    };
    checkStoredKey();
    window.addEventListener('storage', checkStoredKey);
    return () => window.removeEventListener('storage', checkStoredKey);
  }, []);

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return;
    
    setIsSaving(true);
    setMessage(null);

    try {
      // Save to localStorage
      localStorage.setItem('userApiKey', apiKey.trim());
      setHasStoredKey(true);
      
      // If user is logged in, also save to Firebase
      if (user) {
        const response = await fetch('/api/user/api-key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.uid,
          },
          body: JSON.stringify({ apiKey: apiKey.trim() }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to save API key');
        }
      }

      setMessage({ text: 'API key saved successfully! You now have unlimited generations.', type: 'success' });
      setApiKey('');
      
      // Refresh user data
      if (user) {
        await refreshUser();
      }

      // Reload after a moment to apply changes
      setTimeout(() => window.location.reload(), 1500);
      
    } catch (error) {
      setMessage({ 
        text: error instanceof Error ? error.message : 'Failed to save API key', 
        type: 'error' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveApiKey = async () => {
    if (!confirm('Remove your saved API key? You will lose unlimited access.')) return;
    
    setIsRemoving(true);
    setMessage(null);

    try {
      // Remove from localStorage
      localStorage.removeItem('userApiKey');
      setHasStoredKey(false);
      
      // If user is logged in, also remove from Firebase
      if (user) {
        const response = await fetch('/api/user/api-key', {
          method: 'DELETE',
          headers: {
            'x-user-id': user.uid,
          },
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to remove API key');
        }
      }

      setMessage({ text: 'API key removed successfully.', type: 'info' });
      
      // Refresh user data
      if (user) {
        await refreshUser();
      }

      // Reload after a moment to apply changes
      setTimeout(() => window.location.reload(), 1500);
      
    } catch (error) {
      setMessage({ 
        text: error instanceof Error ? error.message : 'Failed to remove API key', 
        type: 'error' 
      });
    } finally {
      setIsRemoving(false);
    }
  };

  if (hasStoredKey) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Using your own API key</p>
              <p className="text-sm text-green-600">Unlimited generations</p>
            </div>
          </div>
          <button
            onClick={handleRemoveApiKey}
            disabled={isRemoving}
            className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
          >
            {isRemoving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
            Remove
          </button>
        </div>
        {message && (
          <p className={`mt-2 text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
            {message.text}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
      <h3 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
        <Key className="w-4 h-4" />
        Enter your own Gemini API key
      </h3>
      <p className="text-xs text-slate-500 mb-3">
        Get unlimited generations by using your own API key.
        {!user && ' Sign in to save it permanently.'}
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste your Gemini API key here..."
            className="input-field pr-10"
            disabled={isSaving}
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <button
          onClick={handleSaveApiKey}
          disabled={isSaving || !apiKey.trim()}
          className="btn-secondary whitespace-nowrap flex items-center gap-2 justify-center"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Save Key
            </>
          )}
        </button>
      </div>
      {message && (
        <p className={`mt-2 text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
          {message.text}
        </p>
      )}
      <p className="mt-2 text-xs text-slate-400">
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
  );
};
// components/ResultDisplay.tsx
'use client';

import React, { useState } from 'react';
import { Download, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface ResultDisplayProps {
  code: string;
  image: string | null;
  experimentNumber: string;
  title: string;
  language: string;
  fileData: string; // Base64 encoded file
  fileName: string;
  remainingTrials: number;
  isPremium: boolean;
  onGenerateAnother: () => void;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({
  code,
  image,
  experimentNumber,
  title,
  language,
  fileData,
  fileName,
  remainingTrials,
  isPremium,
  onGenerateAnother,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showCodePreview, setShowCodePreview] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // Convert base64 to blob
      const byteCharacters = atob(fileData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });

      // Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="card fade-in max-w-3xl mx-auto">
      {/* Success Header */}
      <div className="flex items-center gap-3 mb-6">
        <CheckCircle className="w-6 h-6 text-green-500" />
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Your assignment is ready!
          </h3>
          <p className="text-sm text-slate-500">
            Experiment No. {experimentNumber}{title ? ` - ${title}` : ''}
          </p>
        </div>
      </div>

      {/* File Download */}
      <div className="bg-slate-50 rounded-lg p-4 mb-4 flex items-center justify-between">
        <div>
          <p className="font-medium text-slate-900">{fileName}</p>
          <p className="text-sm text-slate-500">
            {language} • {isPremium ? '♾️ Premium' : `${remainingTrials} trials remaining`}
          </p>
        </div>
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="btn-primary flex items-center gap-2 py-2 px-4"
        >
          <Download className="w-4 h-4" />
          {isDownloading ? 'Downloading...' : 'Download Word File'}
        </button>
      </div>

      {/* Code Preview Toggle */}
      <button
        onClick={() => setShowCodePreview(!showCodePreview)}
        className="text-sm text-blue-600 hover:text-blue-700 font-medium mb-3"
      >
        {showCodePreview ? 'Hide Code Preview' : 'Show Code Preview'}
      </button>

      {/* Code Preview */}
      {showCodePreview && (
        <div className="bg-slate-900 rounded-lg p-4 mb-4 overflow-auto max-h-64">
          <pre className="text-slate-300 text-sm font-mono">
            <code>{code}</code>
          </pre>
        </div>
      )}

      {/* Output Diagram Preview */}
      {image && (
        <div className="bg-slate-50 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-slate-700 mb-2">OUTPUT:</p>
          <pre className="text-slate-800 text-sm font-mono whitespace-pre-wrap">
            {image}
          </pre>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        <button
          onClick={onGenerateAnother}
          className="flex-1 btn-secondary flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Generate Another
        </button>
      </div>

      {/* Trial Info */}
      {!isPremium && (
        <div className="mt-4 text-sm text-slate-500 text-center">
          {remainingTrials > 0 ? (
            <span>
              You have <strong className="text-blue-600">{remainingTrials}</strong> free 
              generations remaining
            </span>
          ) : (
            <span className="text-red-500 flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" />
              No free trials left. Sign in or use your own API key.
            </span>
          )}
        </div>
      )}

      {isPremium && (
        <div className="mt-4 text-sm text-center">
          <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-3 py-1 rounded-full">
            ✨ Premium User - Unlimited Generations
          </span>
        </div>
      )}
    </div>
  );
};
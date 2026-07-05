// components/ResultDisplay.tsx
'use client';

import React, { useState } from 'react';
import { Download, RefreshCw, CheckCircle, AlertCircle, Eye, EyeOff, FileText } from 'lucide-react';

interface ResultDisplayProps {
  code: string;
  image: string | null;
  experimentNumber: string;
  title: string;
  language: string;
  fileData: string;
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
  const [showCode, setShowCode] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const byteCharacters = atob(fileData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

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

  const hasTrialsLeft = remainingTrials > 0 && !isPremium;

  return (
    <div className="card fade-in">
      {/* Success Header */}
      <div className="flex items-start gap-3 mb-4">
        <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Your assignment is ready!
          </h3>
          <p className="text-sm text-slate-500">
            Experiment No. {experimentNumber}{title ? ` - ${title}` : ''}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {language} • {isPremium ? '♾️ Premium' : hasTrialsLeft ? `${remainingTrials} trials remaining` : '⚠️ No trials left'}
          </p>
        </div>
      </div>

      {/* File Download Card */}
      <div className="bg-slate-50 rounded-lg p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-slate-200">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-primary-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-slate-900 text-sm">{fileName}</p>
            <p className="text-xs text-slate-500">Word Document • {Math.round(fileData.length * 0.75 / 1024)} KB</p>
          </div>
        </div>
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="btn-primary flex items-center gap-2 py-2 px-4 text-sm w-full sm:w-auto justify-center"
        >
          <Download className="w-4 h-4" />
          {isDownloading ? 'Downloading...' : 'Download File'}
        </button>
      </div>

      {/* Preview Toggle */}
      <button
        onClick={() => setShowCode(!showCode)}
        className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 mb-3"
      >
        {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        {showCode ? 'Hide Code Preview' : 'Show Code Preview'}
      </button>

      {/* Code Preview */}
      {showCode && (
        <div className="bg-slate-900 rounded-lg p-4 mb-4 overflow-auto max-h-64">
          <pre className="text-slate-300 text-xs font-mono leading-relaxed">
            <code>{code}</code>
          </pre>
        </div>
      )}

      {/* Output Preview */}
      {image && (
        <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Output:</p>
          <pre className="text-slate-800 text-sm font-mono whitespace-pre-wrap leading-relaxed">
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

      {/* Trial Warning */}
      {!isPremium && remainingTrials === 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>No free trials left. <a href="#" className="font-medium underline">Sign in</a> or use your own API key.</span>
        </div>
      )}
    </div>
  );
};
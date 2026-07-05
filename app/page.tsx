// app/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Zap, 
  FileText, 
  Sparkles, 
  Shield, 
  ArrowRight,
  CheckCircle 
} from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-slate-50 pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered Assignment Generator
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tight mb-6">
              Generate University-Level
              <span className="block text-blue-600">Assignments in Seconds</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-8">
              Stop wasting hours on formatting. Get perfectly structured Word documents 
              with code and output diagrams — ready for submission.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href={user ? '/generate' : '/auth'}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
              >
                {user ? 'Go to Generator' : 'Get Started'}
                <ArrowRight className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <CheckCircle className="w-4 h-4 text-green-500" />
                No credit card required
              </div>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-slate-500">
              <span className="flex items-center gap-1">🎓 5 free generations</span>
              <span className="flex items-center gap-1">⚡ 30 seconds per assignment</span>
              <span className="flex items-center gap-1">📄 Word document export</span>
            </div>
          </div>
        </div>
        {/* Decorative blobs */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-200 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-200 rounded-full opacity-20 blur-3xl"></div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Everything You Need to Submit
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              From code generation to perfectly formatted documents — all in one place.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-50 rounded-xl p-8 border border-slate-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Instant Generation</h3>
              <p className="text-slate-600">
                Describe what you need, and AI generates the complete code in seconds. 
                Supports C, Python, Java, and C++.
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-8 border border-slate-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Perfect Formatting</h3>
              <p className="text-slate-600">
                Get a professionally formatted Word document with code blocks, 
                output diagrams, and proper headings — ready to submit.
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-8 border border-slate-200 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Your Own API Key</h3>
              <p className="text-slate-600">
                Use your own Gemini API key for unlimited generations. 
                No restrictions, no limits — just you and the AI.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Three simple steps to get your assignment ready.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Describe</h3>
              <p className="text-slate-600">
                Tell us what program you need. Be specific about the requirements.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Generate</h3>
              <p className="text-slate-600">
                AI writes the code and creates a visual output diagram.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Download</h3>
              <p className="text-slate-600">
                Get your perfectly formatted Word document. Submit it directly.
              </p>
            </div>
          </div>
          <div className="text-center mt-12">
            <Link
              href={user ? '/generate' : '/auth'}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-all"
            >
              Start Generating Now
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <span className="text-sm text-slate-500">
              © 2026 EmberShrubs. All rights reserved.
            </span>
            <div className="flex gap-6 text-sm text-slate-500">
              <span>Built with ❤️ for students</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
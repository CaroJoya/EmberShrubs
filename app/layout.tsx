// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'EmberShrubs - Generate Assignments in Seconds',
  description: 'Generate university-level programming assignments with formatted Word documents, ready for submission.',
  keywords: 'assignment generator, programming assignments, code generation, AI, Gemini',
  authors: [{ name: 'EmberShrubs' }],
  openGraph: {
    title: 'EmberShrubs - Generate Assignments in Seconds',
    description: 'Generate university-level programming assignments with formatted Word documents.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
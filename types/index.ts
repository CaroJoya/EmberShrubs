// types/index.ts

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: number;
  lastLogin: number;
  isPremium: boolean;
  premiumSince?: number;
  premiumExpiry?: number;
  freeTrialsUsed: number;
  maxFreeTrials: number;
  apiKey?: string;
  apiKeyProvider?: 'gemini' | null;
  totalGenerations: number;
}

export interface Guest {
  freeTrialsUsed: number;
  maxFreeTrials: number;
  firstVisit: number;
  lastVisit: number;
  apiKey?: string;
}

export interface Generation {
  id?: string;
  prompt: string;
  language: string;
  code: string;
  outputImageUrl?: string;
  experimentNumber?: string;
  title?: string;
  createdAt: number;
  status: 'pending' | 'completed' | 'failed';
  fileUrl?: string;
}

export interface GenerateRequest {
  prompt: string;
  language: string;
  experimentNumber?: string;
  title?: string;
}

export interface GenerateResponse {
  success: boolean;
  data?: {
    code: string;
    imageUrl?: string;
    experimentNumber: string;
    title?: string;
    language: string;
  };
  error?: string;
  remainingTrials?: number;
}

export interface ApiKeyRequest {
  apiKey: string;
}

export interface UserState {
  user: User | null;
  loading: boolean;
  isPremium: boolean;
  remainingTrials: number;
  isUsingOwnApiKey: boolean;
}
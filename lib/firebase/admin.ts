// lib/firebase/admin.ts
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

// ✅ Only initialize on server
const isServer = typeof window === 'undefined';

// Initialize Firebase Admin (only on server)
function initAdmin(): App | null {
  // ❌ Don't run on client
  if (!isServer) {
    return null;
  }

  const apps = getApps();
  
  if (apps.length > 0) {
    return apps[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin environment variables are not set');
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  });
}

// ✅ Only initialize on server, null on client
const adminApp = isServer ? initAdmin() : null;
const adminAuth = adminApp ? getAuth(adminApp) : null;
const adminDatabase = adminApp ? getDatabase(adminApp) : null;

export { adminApp, adminAuth, adminDatabase };
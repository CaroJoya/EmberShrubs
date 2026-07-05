// lib/firebase/admin.ts
import 'server-only';

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

// Initialize Firebase Admin (only on server)
function initAdmin(): App {
  const apps = getApps();
  
  if (apps.length > 0) {
    return apps[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';

  if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing Firebase Admin env vars:', {
      projectId: !!projectId,
      clientEmail: !!clientEmail,
      privateKey: !!privateKey,
    });
    throw new Error('Firebase Admin environment variables are not set');
  }

  // ✅ Clean up the private key
  privateKey = privateKey.replace(/\\n/g, '\n');
  privateKey = privateKey.replace(/^"|"$/g, '').trim();

  console.log('✅ Firebase Admin initializing for project:', projectId);

  try {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    throw error;
  }
}

const adminApp = initAdmin();
const adminAuth = getAuth(adminApp);
const adminDatabase = getDatabase(adminApp);

export { adminApp, adminAuth, adminDatabase };
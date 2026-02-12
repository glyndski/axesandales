/**
 * Application configuration.
 *
 * Values are injected at build time via Vite env variables.
 * - Local dev:  populated from `.env.local` (gitignored)
 * - CI/CD:      populated from GitHub Secrets → `.env` written in the deploy workflow
 */

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string,
};

export const googleMapsEmbedKey = import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY as string;

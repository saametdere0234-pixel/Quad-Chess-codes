'use client';

import { ReactNode } from 'react';
import { initializeFirebase } from './';
import { FirebaseProvider } from './provider';

const { firebaseApp, auth, firestore } = initializeFirebase();

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  return (
    <FirebaseProvider value={{ firebaseApp, auth, firestore }}>
      {children}
    </FirebaseProvider>
  );
}

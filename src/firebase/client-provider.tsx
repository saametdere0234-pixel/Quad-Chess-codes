'use client';

import { ReactNode } from 'react';
import { initializeFirebase } from './';
import { FirebaseProvider } from './provider';

const { firebaseApp, auth, firestore } = initializeFirebase();

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  // Ensure Firebase is initialized only on the client
  if (typeof window === 'undefined') {
    return <>{children}</>;
  }

  return (
    <FirebaseProvider value={{ firebaseApp, auth, firestore }}>
      {children}
    </FirebaseProvider>
  );
}

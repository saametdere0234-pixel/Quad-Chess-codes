'use client';

import { ReactNode, useMemo } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider, type FirebaseContextValue } from './provider';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
    // useMemo ensures that Firebase is initialized only once per client-side render.
    const contextValue: FirebaseContextValue = useMemo(() => {
        if (typeof window !== 'undefined') {
            // This is the client, initialize firebase
            return initializeFirebase();
        }
        // On the server, we return nulls. Components should handle this gracefully.
        return { firebaseApp: null, auth: null, firestore: null };
    }, []);

    return (
        <FirebaseProvider value={contextValue}>
            {children}
        </FirebaseProvider>
    );
}

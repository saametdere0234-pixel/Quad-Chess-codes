import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';
import { firebaseConfig } from './config';

let firebaseApp: FirebaseApp;
let auth: Auth;
let database: Database;

export function initializeFirebase() {
  if (typeof window !== 'undefined') {
    if (!getApps().length) {
      firebaseApp = initializeApp(firebaseConfig);
      auth = getAuth(firebaseApp);
      database = getDatabase(firebaseApp);
    } else {
      firebaseApp = getApp();
      auth = getAuth(firebaseApp);
      database = getDatabase(firebaseApp);
    }
  }
  
  return {
    firebaseApp,
    auth,
    database,
  };
}

export * from './provider';
export * from './firestore/use-doc';
export * from './firestore/use-collection';
export * from './auth/use-user';

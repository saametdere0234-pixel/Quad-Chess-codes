'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { ReactNode, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';

const PROTECTED_ROUTES = ['/', '/game'];

export default function AuthProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useUser();
  const firestore = useFirestore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading || !firestore) return;

    const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route)) || pathname === '/';
    
    if (!user && isProtectedRoute) {
      router.replace('/login');
      return;
    }

    if (user) {
      if (pathname === '/login' || pathname === '/create-profile') {
        const userDocRef = doc(firestore, 'users', user.uid);
        getDoc(userDocRef).then(userDoc => {
          if (userDoc.exists()) {
            router.replace('/');
          }
        });
      } else {
        const userDocRef = doc(firestore, 'users', user.uid);
        getDoc(userDocRef).then(userDoc => {
          if (!userDoc.exists()) {
            router.replace('/create-profile');
          }
        });
      }
    }

  }, [user, loading, pathname, router, firestore]);

  if (loading) {
      return (
          <div className="flex min-h-screen items-center justify-center">
              <p>Loading...</p>
          </div>
      )
  }

  // Prevent flicker on protected routes
  if (!user && (PROTECTED_ROUTES.some(route => pathname.startsWith(route)) || pathname === '/')) {
      return (
          <div className="flex min-h-screen items-center justify-center">
              <p>Authenticating...</p>
          </div>
      )
  }
  
  // Prevent flicker on public routes when logged in
  if (user && (pathname === '/login' || pathname === '/create-profile')) {
       return (
          <div className="flex min-h-screen items-center justify-center">
              <p>Redirecting...</p>
          </div>
      )
  }


  return <>{children}</>;
}

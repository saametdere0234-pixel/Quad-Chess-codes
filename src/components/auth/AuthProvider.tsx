'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { ReactNode, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';

const PROTECTED_ROUTES = ['/', '/game'];
const PUBLIC_ROUTES = ['/login', '/create-profile'];

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
    }

    if (user) {
      const userDocRef = doc(firestore, 'users', user.uid);
      getDoc(userDocRef).then(userDoc => {
        if (!userDoc.exists() && pathname !== '/create-profile') {
          router.replace('/create-profile');
        } else if (userDoc.exists() && (pathname === '/login' || pathname === '/create-profile')) {
          router.replace('/');
        }
      });
    }

  }, [user, loading, pathname, router, firestore]);

  if (loading) {
      return (
          <div className="flex min-h-screen items-center justify-center">
              <p>Loading...</p>
          </div>
      )
  }

  // Prevent flicker
  if (!user && (PROTECTED_ROUTES.some(route => pathname.startsWith(route)) || pathname === '/')) {
      return (
          <div className="flex min-h-screen items-center justify-center">
              <p>Loading...</p>
          </div>
      )
  }

  return <>{children}</>;
}

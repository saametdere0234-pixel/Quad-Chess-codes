'use client';
import { ReactNode } from 'react';

// This component is a pass-through to disable auth features.
export default function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

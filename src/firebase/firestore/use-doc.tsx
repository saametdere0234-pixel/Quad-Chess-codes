'use client';

import { useState, useEffect } from 'react';
import type { DatabaseReference } from 'firebase/database';
import { onValue } from 'firebase/database';

export const useDoc = <T,>(ref: DatabaseReference | null) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!ref) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = onValue(
      ref,
      (snapshot) => {
        const val = snapshot.val();
        setData(val ? { ...val, id: snapshot.key } as T : null);
        setLoading(false);
        setError(null);
      },
      (error) => {
        console.error('useDoc error:', error);
        setError(error);
        setData(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [ref]);

  return { data, loading, error };
};

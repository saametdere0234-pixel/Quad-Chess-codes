'use client';

import { useState, useEffect } from 'react';
import type {
  Query,
  DocumentData,
  CollectionReference,
} from 'firebase/firestore';
import { onSnapshot } from 'firebase/firestore';

export const useCollection = <T extends DocumentData>(
  ref: Query<T> | CollectionReference<T> | null
) => {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!ref) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        const result: T[] = [];
        snapshot.forEach((doc) => result.push({ ...doc.data(), id: doc.id }));
        setData(result);
        setLoading(false);
        setError(null);
      },
      (error) => {
        console.error('useCollection error:', error);
        setError(error);
        setData(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [ref]);

  return { data, loading, error };
};

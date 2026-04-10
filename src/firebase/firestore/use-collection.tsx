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
      },
      (error) => {
        console.error('useCollection error:', error);
        setData(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [ref]);

  return { data, loading };
};

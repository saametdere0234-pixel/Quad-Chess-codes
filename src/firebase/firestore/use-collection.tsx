'use client';

import { useState, useEffect } from 'react';
import type { Query } from 'firebase/database';
import { onValue } from 'firebase/database';

export const useCollection = <T,>(query: Query | null) => {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onValue(
      query,
      (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const list: T[] = Object.keys(val).map(key => ({ ...val[key], id: key }));
          setData(list);
        } else {
          setData([]);
        }
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
  }, [query]);

  return { data, loading, error };
};

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function CreateProfile() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore || !username.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        username: username.trim(),
      });
      router.push('/');
    } catch (err) {
      console.error('Error creating profile:', err);
      setError('Failed to create profile. Please try again.');
      setLoading(false);
    }
  };
  
  if(userLoading) return <p>Loading...</p>
  if (!user && !userLoading) {
      router.push('/login');
      return null;
  }

  return (
    <form onSubmit={handleCreateProfile}>
      <Card>
        <CardHeader>
          <CardTitle>Choose a Username</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g., ChessMaster123"
            required
          />
          {error && <p className="text-destructive mt-2 text-sm">{error}</p>}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading || !username.trim()} className="w-full">
            {loading ? 'Saving...' : 'Save and Continue'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { getLocalUser, setLocalNickname } from '@/lib/user';

export default function WelcomePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const { nickname } = getLocalUser();
    if (nickname) {
      setNickname(nickname);
    }
  }, []);

  const handleEnterLobby = () => {
    if (nickname.trim().length < 3) {
      setError('Nickname must be at least 3 characters long.');
      return;
    }
    setLocalNickname(nickname);
    router.push('/lobby');
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-primary">Quad Chess King Hunt</CardTitle>
          <CardDescription className="text-center">Enter a nickname to join the lobby and play online.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nickname">Nickname</Label>
            <Input
              id="nickname"
              placeholder="Your awesome name"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                if (error) setError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleEnterLobby()}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <Button className="w-full" onClick={handleEnterLobby}>
            Enter Multiplayer Lobby
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

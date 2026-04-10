'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { createInitialBoard } from '@/lib/game/logic';
import type { GameState } from '@/lib/game/types';
import { PLAYERS } from '@/lib/game/constants';
import { Separator } from '../ui/separator';

function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function Lobby() {
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateRoom = async () => {
    if (!user || !firestore) return;
    setLoading(true);
    setError(null);

    const initialGameState: GameState = {
      board: createInitialBoard(),
      currentPlayerIndex: 0,
      players: PLAYERS,
      eliminatedPlayerIds: [],
      winner: null,
      lastMove: null,
      enPassantTarget: null,
      capturedPieces: {},
    };

    try {
      const newRoomCode = generateRoomCode();
      const gameRef = await addDoc(collection(firestore, 'games'), {
        roomCode: newRoomCode,
        players: { Red: user.uid }, // Host is always Red
        playerIds: [user.uid],
        gameState: JSON.stringify(initialGameState),
        status: 'waiting',
        host: user.uid,
      });
      router.push(`/game/${gameRef.id}`);
    } catch (err) {
      console.error("Error creating room:", err);
      setError("Failed to create room. Please try again.");
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore || !roomCode) return;
    setLoading(true);
    setError(null);
    
    try {
      const gamesRef = collection(firestore, 'games');
      const q = query(gamesRef, where('roomCode', '==', roomCode), where('status', '==', 'waiting'));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('Room not found or is already in progress.');
        setLoading(false);
        return;
      }

      const gameDoc = querySnapshot.docs[0];
      router.push(`/game/${gameDoc.id}`);

    } catch (err) {
      console.error("Error joining room:", err);
      setError("Failed to join room. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create a New Game</CardTitle>
          <CardDescription>Start a new game and invite your friends.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleCreateRoom} disabled={loading} className="w-full">
            {loading ? 'Creating...' : 'Create Room'}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Join a Game</CardTitle>
          <CardDescription>Enter a 6-digit room code to join an existing game.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoinRoom} className="flex space-x-2">
            <Input
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
              required
            />
            <Button type="submit" disabled={loading}>
              {loading ? 'Joining...' : 'Join'}
            </Button>
          </form>
           {error && <p className="text-destructive mt-2 text-sm">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

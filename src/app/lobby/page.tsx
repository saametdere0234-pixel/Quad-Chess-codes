'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCollection, useFirestore } from '@/firebase';
import { collection, serverTimestamp, query, doc, setDoc, limit, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getLocalUser } from '@/lib/user';
import { createInitialBoard } from '@/lib/game/logic';
import { PLAYERS } from '@/lib/game/constants';
import type { GameState } from '@/lib/game/types';
import { Loader2, Users, LogIn, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Generates a 6-character uppercase alphanumeric code.
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function LobbyPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { nickname, userId } = getLocalUser();
  const [joinCode, setJoinCode] = useState('');

  // A real-time query for waiting rooms.
  const roomsQuery = useMemo(() => 
    firestore 
      ? query(
          collection(firestore, 'rooms'),
          where('status', '==', 'waiting'),
          limit(50)
        )
      : null
  , [firestore]);

  const { data: rooms, loading } = useCollection(roomsQuery);
  
  // Sort rooms on the client-side to avoid complex Firestore indexes
  const sortedRooms = useMemo(() => {
    if (!rooms) return [];
    return [...rooms].sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
  }, [rooms]);


  const handleCreateRoom = async () => {
    if (!firestore || !nickname || !userId) return;

    const roomId = generateRoomCode();
    const roomRef = doc(firestore, 'rooms', roomId);

    const initialGameState: GameState = {
      board: createInitialBoard(),
      currentPlayerIndex: 0,
      players: PLAYERS,
      eliminatedPlayerIds: [],
      winner: null,
      lastMove: null,
      enPassantTarget: null,
      capturedPieces: {},
      status: 'waiting',
    };

    try {
      await setDoc(roomRef, {
        id: roomId,
        name: `${nickname}'s Game`,
        players: [{ userId, nickname, playerId: 'Red' }], // The creator is the first player
        gameState: JSON.stringify(initialGameState),
        status: 'waiting',
        createdAt: serverTimestamp(),
      });
      router.push(`/room/${roomId}`);
    } catch (error) => {
      console.error("Error creating room:", error);
    }
  };
  
  // This function just navigates, the joining logic is on the room page
  const handleJoinRoomFromList = (roomId: string) => {
    router.push(`/room/${roomId}`);
  }

  const handleJoinWithCode = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length === 6) {
        router.push(`/room/${code}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-10 bg-background">
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
           <Button variant="ghost" onClick={() => router.push('/')}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
          <h1 className="text-3xl font-bold text-primary">Multiplayer Lobby</h1>
          <div/> {/* Spacer */}
        </div>

        <Card className="mb-6">
            <CardContent className="p-4 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                    <Input 
                        type="text" 
                        placeholder="Enter room code"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleJoinWithCode()}
                        maxLength={6}
                        className="w-48"
                    />
                    <Button onClick={handleJoinWithCode} disabled={joinCode.trim().length !== 6}>
                        Join with Code
                    </Button>
                </div>
                 <div className="flex items-center space-x-4">
                    <p className="text-sm text-muted-foreground">OR</p>
                    <Button onClick={handleCreateRoom} variant="outline">Create New Room</Button>
                </div>
            </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Available Rooms</CardTitle>
            <CardDescription>Join an existing game or create your own.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : sortedRooms && sortedRooms.length > 0 ? (
              <div className="space-y-4">
                {sortedRooms.map((room) => (
                  <div key={room.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{room.name}</h3>
                      <p className="text-sm text-muted-foreground">ID: {room.id} - Host: {room.players[0]?.nickname || 'Unknown'}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className='flex items-center space-x-1 text-sm text-muted-foreground'>
                            <Users className="h-4 w-4" />
                            <span>{room.players.length} / 4</span>
                        </div>
                        {room.players.length >= 4 ? (
                           <Badge variant="destructive">FULL</Badge>
                        ) : (
                           <Button onClick={() => handleJoinRoomFromList(room.id)}>
                                <LogIn className="mr-2 h-4 w-4" />
                                Join
                           </Button>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground p-8">No rooms available. Why not create one?</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCollection, useFirestore } from '@/firebase';
import { collection, serverTimestamp, query, orderBy, updateDoc, doc, arrayUnion, setDoc, limit } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getLocalUser } from '@/lib/user';
import { createInitialBoard } from '@/lib/game/logic';
import { PLAYERS, PLAYER_IDS } from '@/lib/game/constants';
import type { GameState } from '@/lib/game/types';
import { Loader2, Users, LogIn, ArrowLeft } from 'lucide-react';

function generateSixDigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function LobbyPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { nickname, userId } = getLocalUser();

  // Optimized query to fetch recent rooms, filtering for 'waiting' on the client.
  // This avoids the need for a composite index and improves initial load time.
  const roomsQuery = useMemo(() => 
    firestore 
      ? query(
          collection(firestore, 'rooms'),
          orderBy('createdAt', 'desc'),
          limit(50) // Limit to a reasonable number of rooms
        )
      : null
  , [firestore]);

  const { data: allRooms, loading } = useCollection(roomsQuery);
  
  // Filter for waiting rooms on the client
  const rooms = useMemo(() => allRooms?.filter(room => room.status === 'waiting'), [allRooms]);

  const handleCreateRoom = async () => {
    if (!firestore || !nickname || !userId) return;

    const roomId = generateSixDigitCode();
    const roomRef = doc(firestore, 'rooms', roomId); // Use the 6-digit code as the document ID

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
      // Use setDoc to create a document with a specific ID
      await setDoc(roomRef, {
        id: roomId,
        name: `${nickname}'s Game`,
        players: [{ userId, nickname, playerId: 'Red' }],
        gameState: JSON.stringify(initialGameState),
        status: 'waiting',
        createdAt: serverTimestamp(),
      });
      router.push(`/room/${roomId}`);
    } catch (error) {
      console.error("Error creating room:", error);
    }
  };

  const handleJoinRoom = async (roomId: string, currentPlayers: any[]) => {
    if (!firestore || !nickname || !userId) return;
    
    if (currentPlayers.length >= 4) {
      alert("Room is full.");
      return;
    }
    
    if (currentPlayers.find(p => p.userId === userId)) {
       router.push(`/room/${roomId}`);
       return;
    }

    const roomDocRef = doc(firestore, 'rooms', roomId);
    const assignedPlayerId = PLAYER_IDS[currentPlayers.length];
    
    await updateDoc(roomDocRef, {
      players: arrayUnion({ userId, nickname, playerId: assignedPlayerId })
    });
    router.push(`/room/${roomId}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-10 bg-background">
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" onClick={() => router.push('/')}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
          <h1 className="text-3xl font-bold text-primary">Multiplayer Lobby</h1>
          <Button onClick={handleCreateRoom}>Create Room</Button>
        </div>
        
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
            ) : rooms && rooms.length > 0 ? (
              <div className="space-y-4">
                {rooms.map((room) => (
                  <div key={room.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{room.name}</h3>
                      <p className="text-sm text-muted-foreground">ID: {room.id} - Created by {room.players[0]?.nickname || 'Unknown'}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className='flex items-center space-x-1 text-sm text-muted-foreground'>
                            <Users className="h-4 w-4" />
                            <span>{room.players.length} / 4</span>
                        </div>
                        <Button onClick={() => handleJoinRoom(room.id, room.players)} disabled={room.players.length >= 4}>
                            <LogIn className="mr-2 h-4 w-4" />
                            Join
                        </Button>
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

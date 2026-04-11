'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCollection, useDatabase } from '@/firebase';
import { ref, serverTimestamp, query, set, limitToLast, orderByChild } from 'firebase/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getLocalUser } from '@/lib/user';
import { createInitialBoard } from '@/lib/game/logic';
import { PLAYER_IDS } from '@/lib/game/constants';
import type { GameState } from '@/lib/game/types';
import { Loader2, Users, LogIn, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function LobbyPage() {
  const router = useRouter();
  const database = useDatabase();
  const { nickname, userId } = getLocalUser();
  const [joinCode, setJoinCode] = useState('');

  const roomsRef = useMemo(() => database ? ref(database, 'rooms') : null, [database]);
  
  const roomsQuery = useMemo(() => 
    roomsRef ? query(roomsRef, orderByChild('createdAt'), limitToLast(50)) : null,
    [roomsRef]
  );
  
  const { data: roomsData, loading } = useCollection(roomsQuery);
  
  const rooms = useMemo(() => {
    if (!roomsData) return [];
    return roomsData
        .filter((room: any) => room.status === 'waiting')
        .sort((a: any, b: any) => b.createdAt - a.createdAt);
  }, [roomsData]);


  const handleCreateRoom = async () => {
    if (!database || !nickname || !userId) return;

    const roomId = generateRoomCode();
    const roomRef = ref(database, 'rooms/' + roomId);

    const initialGameState: GameState = {
      board: createInitialBoard(),
      currentPlayerIndex: 0,
      players: [],
      eliminatedPlayerIds: [],
      winner: null,
      lastMove: null,
      enPassantTarget: null,
      capturedPieces: {},
      status: 'waiting',
    };
    
    const newPlayer = {
      userId,
      nickname,
      playerId: PLAYER_IDS[0],
    };

    try {
      await set(roomRef, {
        id: roomId,
        name: `${nickname}'s Game`,
        players: { [userId]: newPlayer },
        gameState: JSON.stringify(initialGameState),
        status: 'waiting',
        createdAt: serverTimestamp(),
      });
      router.push(`/room/${roomId}`);
    } catch (error) {
      console.error("Error creating room:", error);
    }
  };
  
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
          <div/>
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
            ) : rooms && rooms.length > 0 ? (
              <div className="space-y-4">
                {rooms.map((room: any) => {
                  const playersArray = room.players ? Object.values(room.players) : [];
                  const host = playersArray[0] as any;
                  return (
                  <div key={room.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{room.name}</h3>
                      <p className="text-sm text-muted-foreground">ID: {room.id} - Host: {host?.nickname || 'Unknown'}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className='flex items-center space-x-1 text-sm text-muted-foreground'>
                            <Users className="h-4 w-4" />
                            <span>{playersArray.length} / 4</span>
                        </div>
                        {playersArray.length >= 4 ? (
                           <Badge variant="destructive">FULL</Badge>
                        ) : (
                           <Button onClick={() => handleJoinRoomFromList(room.id)}>
                                <LogIn className="mr-2 h-4 w-4" />
                                Join
                           </Button>
                        )}
                    </div>
                  </div>
                )})}
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

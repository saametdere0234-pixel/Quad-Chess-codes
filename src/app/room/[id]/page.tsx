'use client';

import { useMemo } from 'react';
import Game from '@/components/game/Game';
import { useFirestore, useDoc } from '@/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { getLocalUser } from '@/lib/user';
import { useEffect } from 'react';
import { PLAYER_IDS } from '@/lib/game/constants';
import { Button } from '@/components/ui/button';
import { Loader2, Users } from 'lucide-react';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { userId, nickname } = getLocalUser();

  const roomId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const roomRef = useMemo(() => 
    firestore && roomId ? doc(firestore, 'rooms', roomId) : null
  , [firestore, roomId]);
  
  const { data: roomData, loading: roomLoading } = useDoc(roomRef);

  useEffect(() => {
    if (!roomLoading && !roomData && firestore) {
      // Room doesn't exist, redirect to lobby
      router.push('/lobby');
    }
  }, [roomLoading, roomData, router, firestore]);

  const handleJoin = async () => {
    if (!roomRef || !roomData || !userId || !nickname) return;
    
    if (roomData.players.length >= 4) return;
    if (roomData.players.some((p: any) => p.userId === userId)) return;
    
    const assignedPlayerId = PLAYER_IDS[roomData.players.length];
    await updateDoc(roomRef, {
      players: arrayUnion({ userId, nickname, playerId: assignedPlayerId })
    });
  }

  const handleStartGame = async () => {
    if (!roomRef) return;
    await updateDoc(roomRef, { status: 'in-progress' });
  }

  if (roomLoading || !roomData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Room...</p>
      </div>
    );
  }

  const userInRoom = roomData.players.some((p: any) => p.userId === userId);
  const isHost = roomData.players[0]?.userId === userId;

  if (roomData.status === 'waiting') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background text-center">
        <h1 className="text-3xl font-bold mb-2">Waiting for Players</h1>
        <p className="text-muted-foreground mb-6">Room ID: {roomData.id}</p>
        
        <div className="w-full max-w-md bg-card p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center justify-center"><Users className="mr-2"/> Players ({roomData.players.length}/4)</h2>
          <ul className="space-y-2">
            {roomData.players.map((p: any, index: number) => (
              <li key={p.userId} className="flex items-center justify-center text-lg">
                <span className="font-semibold" style={{color: PLAYER_IDS[index] ? PLAYERS.find(pl => pl.id === PLAYER_IDS[index])!.color : 'inherit'}}>{p.nickname}</span>
                <span className="text-sm text-muted-foreground ml-2">({PLAYER_IDS[index]})</span>
              </li>
            ))}
          </ul>
        </div>
        
        {!userInRoom && roomData.players.length < 4 && (
          <Button onClick={handleJoin} className="mb-4">Join Game</Button>
        )}
        
        {isHost && userInRoom && (
          <Button onClick={handleStartGame} disabled={roomData.players.length < 2}>
            Start Game ({roomData.players.length} players)
          </Button>
        )}
         <Button variant="link" onClick={() => router.push('/lobby')} className="mt-4">Back to Lobby</Button>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 lg:p-8 bg-background">
      <div className="w-full max-w-7xl mx-auto">
        <Game isMultiplayer={true} roomId={roomId} />
      </div>
    </main>
  );
}

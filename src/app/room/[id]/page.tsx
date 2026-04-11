'use client';

import { useMemo, useEffect, useCallback } from 'react';
import Game from '@/components/game/Game';
import { useDatabase, useDoc } from '@/firebase';
import { ref, update, runTransaction, remove } from 'firebase/database';
import { useParams, useRouter } from 'next/navigation';
import { getLocalUser } from '@/lib/user';
import { PLAYER_IDS, PLAYERS } from '@/lib/game/constants';
import { Button } from '@/components/ui/button';
import { Loader2, Users } from 'lucide-react';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const database = useDatabase();
  const { userId, nickname } = getLocalUser();

  const roomId = useMemo(() => 
    (Array.isArray(params.id) ? params.id[0] : params.id || '').toUpperCase()
  , [params.id]);
  
  const roomRef = useMemo(() => 
    database && roomId ? ref(database, 'rooms/' + roomId) : null
  , [database, roomId]);
  
  const { data: roomData, loading: roomLoading } = useDoc(roomRef);

  const playersArray = useMemo(() => roomData?.players ? Object.values(roomData.players) : [], [roomData]);

  useEffect(() => {
    if (roomLoading || !database || !roomRef || !userId || !nickname) return;

    if (!roomData) {
      alert('Room not found. You will be redirected to the lobby.');
      router.push('/lobby');
      return;
    }
    
    const userInRoom = roomData.players && roomData.players[userId];

    if (!userInRoom) {
      if (roomData.status !== 'waiting') {
        alert('This game has already started. You will be redirected to the lobby.');
        router.push('/lobby');
        return;
      }

      runTransaction(roomRef, (currentData) => {
        if (currentData) {
          const players = currentData.players || {};
          if (Object.keys(players).length < 4) {
             const assignedPlayerId = PLAYER_IDS[Object.keys(players).length];
             if (!players[userId]) {
                players[userId] = { userId, nickname, playerId: assignedPlayerId };
             }
             currentData.players = players;
          } else {
            return;
          }
        }
        return currentData;
      }).then(({ committed }) => {
        if (!committed) {
             alert('This room is full. You will be redirected to the lobby.');
             router.push('/lobby');
        }
      }).catch(error => {
        console.error("Error joining room:", error);
        alert("There was an error trying to join the room.");
        router.push('/lobby');
      });
    }
  }, [roomLoading, roomData, database, roomRef, userId, nickname, router, roomId]);


  const handleStartGame = async () => {
    if (!roomRef) return;
    try {
        await update(roomRef, { status: 'in-progress' });
    } catch (error) {
        console.error("Error starting game:", error);
        alert("Could not start the game.");
    }
  }

  const handleLeaveRoom = useCallback(() => {
    if (!roomRef || !userId) return;

    runTransaction(roomRef, (currentData) => {
        if (currentData) {
            if (currentData.players && currentData.players[userId]) {
                delete currentData.players[userId];
            }
            // If no players are left, delete the room
            if (!currentData.players || Object.keys(currentData.players).length === 0) {
                return null; // Returning null from a transaction deletes the data
            }
        }
        return currentData;
    }).then(() => {
        router.push('/lobby');
    }).catch(error => {
        console.error("Error leaving room:", error);
        alert("There was an error trying to leave the room.");
    });
}, [roomRef, userId, router]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        handleLeaveRoom();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [handleLeaveRoom]);


  if (roomLoading || !roomData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Room {roomId}...</p>
      </div>
    );
  }

  const sortedPlayers = Object.values(roomData.players || {}).sort((a: any, b: any) => PLAYER_IDS.indexOf(a.playerId) - PLAYER_IDS.indexOf(b.playerId));
  const isHost = sortedPlayers[0]?.userId === userId;
  const userInRoom = roomData.players && roomData.players[userId];


  if (roomData.status === 'waiting') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background text-center">
        <h1 className="text-3xl font-bold mb-2">Waiting for Players</h1>
        <p className="text-muted-foreground mb-6">Room ID: <span className='font-mono p-1 bg-muted rounded'>{roomData.id}</span></p>
        
        <div className="w-full max-w-md bg-card p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center justify-center"><Users className="mr-2"/> Players ({playersArray.length}/4)</h2>
          <ul className="space-y-2">
            {sortedPlayers.map((p: any) => {
               const playerInfo = PLAYERS.find(pi => pi.id === p.playerId);
               return (
                 playerInfo && <li key={p.userId} className="flex items-center justify-center text-lg">
                    <span 
                      className="font-semibold" 
                      style={{color: playerInfo.color}}
                    >
                      {p.nickname}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">({playerInfo.id})</span>
                 </li>
               )
            })}
          </ul>
        </div>
        
        {isHost && userInRoom && (
          <Button onClick={handleStartGame} disabled={playersArray.length < 2}>
            Start Game ({playersArray.length} players)
          </Button>
        )}
        {!userInRoom && (
             <div className="flex flex-col items-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p>Joining room...</p>
            </div>
        )}
         <Button variant="link" onClick={() => router.push('/lobby')} className="mt-4">Back to Lobby</Button>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 lg:p-8 bg-background">
      <div className="w-full max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 font-headline text-primary">
          {roomData.name}
        </h1>
        <Game roomId={roomId} onLeaveRoom={handleLeaveRoom} />
      </div>
    </main>
  );
}

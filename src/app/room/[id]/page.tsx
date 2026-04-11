'use client';

import { useMemo, useEffect, useCallback, useState } from 'react';
import Game from '@/components/game/Game';
import { useDatabase, useDoc } from '@/firebase';
import { ref, update, runTransaction } from 'firebase/database';
import { useParams, useRouter } from 'next/navigation';
import { getLocalUser } from '@/lib/user';
import { PLAYER_IDS, PLAYERS } from '@/lib/game/constants';
import { Button } from '@/components/ui/button';
import { Loader2, Users, User, Tv } from 'lucide-react';
import type { Player } from '@/lib/game/types';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const database = useDatabase();
  const { userId, nickname } = getLocalUser();
  const [userRole, setUserRole] = useState<'joining' | 'player' | 'spectator'>('joining');

  const roomId = useMemo(() => 
    (Array.isArray(params.id) ? params.id[0] : params.id || '').toUpperCase()
  , [params.id]);
  
  const roomRef = useMemo(() => 
    database && roomId ? ref(database, 'rooms/' + roomId) : null
  , [database, roomId]);
  
  const { data: roomData, loading: roomLoading } = useDoc(roomRef);

  useEffect(() => {
    if (roomLoading || !database || !roomRef || !userId || !nickname) return;

    if (!roomData) {
      alert('Room not found. You will be redirected to the lobby.');
      router.push('/lobby');
      return;
    }
    
    const isPlayer = roomData.players && roomData.players[userId];
    const isSpectator = roomData.spectators && roomData.spectators[userId];

    if (isPlayer) {
      setUserRole('player');
      return;
    }
    if (isSpectator) {
      setUserRole('spectator');
      return;
    }

    runTransaction(roomRef, (currentData) => {
      if (!currentData) return; // Room was deleted

      const players = currentData.players || {};
      const playerCount = Object.keys(players).length;

      if (currentData.status === 'waiting' && playerCount < 4) {
        const assignedPlayerId = PLAYER_IDS[playerCount];
        players[userId] = { userId, nickname, playerId: assignedPlayerId };
        currentData.players = players;
      } else {
        const spectators = currentData.spectators || {};
        if (!spectators[userId]) {
          spectators[userId] = { userId, nickname };
        }
        currentData.spectators = spectators;
      }
      return currentData;
    }).then(({ committed, snapshot }) => {
      if (!committed) {
        alert('Could not join the room. It might be full or has been deleted.');
        router.push('/lobby');
      } else {
        const latestData = snapshot.val();
        if (latestData.players && latestData.players[userId]) {
          setUserRole('player');
        } else {
          setUserRole('spectator');
        }
      }
    }).catch(error => {
      console.error("Error joining room:", error);
      alert("There was an error trying to join the room.");
      router.push('/lobby');
    });

  }, [roomLoading, roomData, database, roomRef, userId, nickname, router, roomId]);


  const handleStartGame = async () => {
    if (!roomRef || !roomData?.players || Object.keys(roomData.players).length < 2) return;

    const playersInRoom = Object.values(roomData.players);
    const sortedPlayers = playersInRoom.sort((a: any, b: any) => PLAYER_IDS.indexOf(a.playerId) - PLAYER_IDS.indexOf(b.playerId));

    const gamePlayers = sortedPlayers.map((p: any) => ({
        id: p.playerId,
        name: p.nickname,
        color: PLAYERS.find(pl => pl.id === p.playerId)!.color
    }));
    
    const currentGameState = JSON.parse(roomData.gameState);
    
    const updatedGameState = {
        ...currentGameState,
        players: gamePlayers,
        status: 'in-progress'
    };

    try {
        await update(roomRef, { 
            status: 'in-progress',
            gameState: JSON.stringify(updatedGameState)
        });
    } catch (error) {
        console.error("Error starting game:", error);
        alert("Could not start the game.");
    }
  }

  const handleLeaveRoom = useCallback(() => {
    if (!roomRef || !userId) return;

    runTransaction(roomRef, (currentData) => {
        if (!currentData) return null;

        const isPlayer = currentData.players && currentData.players[userId];
        
        if (isPlayer) {
            const playerToRemoveId = currentData.players[userId].playerId;
            delete currentData.players[userId];

            if (currentData.status === 'in-progress' && playerToRemoveId) {
                const gameState = JSON.parse(currentData.gameState);
                if (gameState && !gameState.eliminatedPlayerIds.includes(playerToRemoveId)) {
                    gameState.eliminatedPlayerIds.push(playerToRemoveId);
                    
                    const activePlayers = gameState.players.filter((p: Player) => !gameState.eliminatedPlayerIds.includes(p.id));
                    if (activePlayers.length <= 1) {
                        gameState.winner = activePlayers[0]?.id || null;
                        gameState.status = 'finished';
                    } else {
                        if (gameState.players[gameState.currentPlayerIndex].id === playerToRemoveId) {
                            let nextPlayerIndex = gameState.currentPlayerIndex;
                            do {
                                nextPlayerIndex = (nextPlayerIndex + 1) % gameState.players.length;
                            } while (gameState.eliminatedPlayerIds.includes(gameState.players[nextPlayerIndex].id));
                            gameState.currentPlayerIndex = nextPlayerIndex;
                        }
                    }
                    currentData.gameState = JSON.stringify(gameState);
                }
            }
        } else {
            if (currentData.spectators && currentData.spectators[userId]) {
                delete currentData.spectators[userId];
            }
        }
        
        const remainingPlayers = currentData.players ? Object.keys(currentData.players).length : 0;
        const remainingSpectators = currentData.spectators ? Object.keys(currentData.spectators).length : 0;

        if (remainingPlayers === 0 && remainingSpectators === 0) {
            return null;
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
    window.addEventListener('beforeunload', handleLeaveRoom);
    return () => {
        window.removeEventListener('beforeunload', handleLeaveRoom);
    };
  }, [handleLeaveRoom]);


  if (roomLoading || !roomData || userRole === 'joining') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Room {roomId}...</p>
      </div>
    );
  }
  
  const sortedPlayers = Object.values(roomData.players || {}).sort((a: any, b: any) => PLAYER_IDS.indexOf(a.playerId) - PLAYER_IDS.indexOf(b.playerId));
  const spectatorsArray = Object.values(roomData.spectators || {});
  const isHost = sortedPlayers[0]?.userId === userId;

  if (roomData.status === 'waiting') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background text-center">
        <h1 className="text-3xl font-bold mb-2">Waiting for Players</h1>
        <p className="text-muted-foreground mb-6">Room ID: <span className='font-mono p-1 bg-muted rounded'>{roomData.id}</span></p>
        
        <div className="w-full max-w-lg flex justify-around gap-6">
            <div className="w-1/2 bg-card p-6 rounded-lg shadow-sm mb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center justify-center"><Users className="mr-2"/> Players ({sortedPlayers.length}/4)</h2>
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
            <div className="w-1/2 bg-card p-6 rounded-lg shadow-sm mb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center justify-center"><Tv className="mr-2"/> Spectators ({spectatorsArray.length})</h2>
              {spectatorsArray.length > 0 ? (
                <ul className="space-y-2">
                  {spectatorsArray.map((s: any) => (
                    <li key={s.userId} className="text-lg text-muted-foreground">{s.nickname}</li>
                  ))}
                </ul>
              ) : <p className="text-muted-foreground">No spectators yet.</p>}
            </div>
        </div>
        
        <div className="flex flex-col items-center">
            {isHost && userRole === 'player' && (
              <>
                <Button onClick={handleStartGame} disabled={sortedPlayers.length !== 4}>
                  Start Game ({sortedPlayers.length}/4 players)
                </Button>
                {sortedPlayers.length !== 4 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    You need 4 players to start the game.
                  </p>
                )}
              </>
            )}
        </div>

         <Button variant="link" onClick={handleLeaveRoom} className="mt-4">Back to Lobby</Button>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 lg:p-8 bg-background">
      <div className="w-full max-w-7xl mx-auto">
        <Game roomId={roomId} onLeaveRoom={handleLeaveRoom} userRole={userRole} roomData={roomData} />
      </div>
    </main>
  );
}

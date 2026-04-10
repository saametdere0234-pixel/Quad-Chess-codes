'use client';

import { useParams } from 'next/navigation';
import { useFirestore, useUser, useDoc } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import Game from '@/components/game/Game';
import type { GameState } from '@/lib/game/types';
import { Button } from '@/components/ui/button';

export default function GamePage() {
  const { gameId } = useParams() as { gameId: string };
  const { user } = useUser();
  const firestore = useFirestore();

  const gameRef = firestore ? doc(firestore, 'games', gameId) : null;
  const { data: game, loading } = useDoc(gameRef);

  const handleJoin = async (color: string) => {
      if (!user || !firestore || !game) return;

      const currentPlayers = game.players || {};
      const currentPlayerIds = game.playerIds || [];

      if (Object.values(currentPlayers).includes(user.uid) || currentPlayerIds.length >= 4) return;
      
      const newPlayers = { ...currentPlayers, [color]: user.uid };
      const newPlayerIds = [...currentPlayerIds, user.uid];
      
      await updateDoc(doc(firestore, 'games', gameId), {
          players: newPlayers,
          playerIds: newPlayerIds,
      });
  };
  
  const handleStartGame = async () => {
    if (!user || !firestore || !game || game.host !== user.uid) return;
    await updateDoc(doc(firestore, 'games', gameId), {
        status: 'in-progress',
    });
  }

  if (loading || !game) {
    return <div className="flex min-h-screen items-center justify-center">Loading Game...</div>;
  }
  
  const gameState: GameState | null = game.gameState ? JSON.parse(game.gameState) : null;
  
  if (!user || !gameState) {
     return <div className="flex min-h-screen items-center justify-center">Authenticating...</div>;
  }
  
  const playerColor = Object.keys(game.players).find(key => game.players[key] === user.uid);
  const isPlayerInGame = !!playerColor;
  
  if (!isPlayerInGame && game.status === 'waiting' && game.playerIds.length < 4) {
      const availableColors = ['Red', 'Yellow', 'Blue', 'Green'].filter(c => !Object.keys(game.players).includes(c));
      
      return (
        <div className="flex min-h-screen items-center justify-center">
            <div className='text-center'>
                <h2 className='text-2xl mb-4'>Join Game</h2>
                <p className='mb-4'>Room Code: {game.roomCode}</p>
                <p className='mb-4'>Select a color to join:</p>
                <div className='flex gap-4 justify-center'>
                    {availableColors.map(color => (
                        <Button key={color} onClick={() => handleJoin(color)}>Join as {color}</Button>
                    ))}
                </div>
            </div>
        </div>
      )
  }
  
  if (!isPlayerInGame && game.status !== 'waiting') {
      return <div className="flex min-h-screen items-center justify-center">This game is already in progress.</div>;
  }
  if (!isPlayerInGame) {
      return <div className="flex min-h-screen items-center justify-center">This game is full.</div>;
  }

  if (game.status === 'waiting') {
    return (
        <div className="flex min-h-screen items-center justify-center text-center">
            <div>
                <h2 className="text-3xl font-bold mb-4">Waiting Room</h2>
                <p className="mb-2">Room Code: <span className="font-bold text-lg tracking-widest">{game.roomCode}</span></p>
                <p className="mb-4">Waiting for players to join...</p>
                <ul className="mb-6">
                    {gameState.players.map(p => (
                        <li key={p.id} className="flex items-center justify-center gap-2">
                             <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.color }}/>
                             <span>{p.name}: {game.players[p.id] ? "Joined" : "Waiting..."}</span>
                        </li>
                    ))}
                </ul>
                {game.host === user.uid && (
                    <Button onClick={handleStartGame} disabled={game.playerIds.length < 2}>Start Game</Button>
                )}
                 {game.host !== user.uid && (
                    <p>The host will start the game shortly.</p>
                )}
            </div>
        </div>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 lg:p-8 bg-background">
      <div className="w-full max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 font-headline text-primary">
          Quad Chess King Hunt
        </h1>
        <p className="text-center text-muted-foreground mb-4">Room Code: {game.roomCode}</p>
        <Game
          gameId={gameId}
          initialGameState={gameState}
          playersMap={game.players}
          currentUserPlayerId={playerColor as any}
        />
      </div>
    </main>
  );
}

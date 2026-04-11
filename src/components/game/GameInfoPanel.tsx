'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Crown, Swords, Box, LogOut, Undo, Redo } from 'lucide-react';
import type { Player, Piece, PlayerId } from '@/lib/game/types';
import { PIECE_EMOJIS, PLAYERS } from '@/lib/game/constants';
import { cn } from '@/lib/utils';

interface GameInfoPanelProps {
  currentPlayer: Player;
  eliminatedPlayers: Player[];
  winner: Player | null;
  onLeaveRoom: () => void;
  capturedPieces: { [key in PlayerId]?: Piece[] };
  players: Player[];
  isMultiplayer?: boolean;
  roomName?: string;
}

const CapturedPiece = ({ piece }: { piece: Piece }) => {
    const player = PLAYERS.find(p => p.id === piece.player);
    if (!player) return null;

    return (
        <span
          className="text-xl"
          title={`${player.name} ${piece.type}`}
           style={{
                color: player.color,
                WebkitTextStroke: '1px black',
                paintOrder: 'stroke fill',
            }}
        >
            {PIECE_EMOJIS[piece.player][piece.type]}
        </span>
    )
}

export default function GameInfoPanel({
  currentPlayer,
  eliminatedPlayers,
  winner,
  onLeaveRoom,
  capturedPieces,
  players,
  isMultiplayer,
  roomName,
}: GameInfoPanelProps) {
  const activePlayers = players.filter(p => !eliminatedPlayers.find(ep => ep.id === p.id));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{isMultiplayer ? 'Multiplayer Game' : 'Local Game'}</span>
            <div className='flex items-center space-x-1'>
                <Button variant="ghost" size="icon" disabled={true} aria-label="Undo move">
                    <Undo className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" disabled={true} aria-label="Redo move">
                    <Redo className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onLeaveRoom} aria-label="Leave Room">
                   <LogOut className="h-5 w-5" />
                </Button>
            </div>
          </CardTitle>
          {isMultiplayer && roomName && <CardDescription>Room: {roomName}</CardDescription>}
        </CardHeader>
        <CardContent>
          {winner ? (
            <div className="text-center p-4 bg-accent/20 rounded-lg">
              <Crown className="mx-auto h-12 w-12 text-yellow-500 mb-2" />
              <h3 className="text-lg font-semibold" style={{ color: winner.color }}>
                {winner.name} is the winner!
              </h3>
            </div>
          ) : (
             currentPlayer && <div>
              <p className="text-sm text-muted-foreground mb-1">Current Turn:</p>
              <div className="flex items-center space-x-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: currentPlayer.color }}
                />
                <p className="font-semibold text-lg">{currentPlayer.name}</p>
              </div>
            </div>
          )}
          
          <Separator className="my-4" />

          <div>
             <h4 className="text-sm font-semibold mb-2 flex items-center">
                <Swords className="h-4 w-4 mr-2" />
                Eliminated Players
             </h4>
             {eliminatedPlayers.length > 0 ? (
                <ul className="space-y-1 text-sm text-muted-foreground">
                    {eliminatedPlayers.map(p => (
                        <li key={p.id} className="line-through flex items-center">
                            <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: p.color }}/>
                            {p.name}
                        </li>
                    ))}
                </ul>
             ) : (
                <p className="text-sm text-muted-foreground">None yet.</p>
             )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Box className="h-5 w-5 mr-2" />
            Captured Pieces
          </CardTitle>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-48">
                <div className='space-y-3'>
                {activePlayers.map(player => (
                    <div key={player.id}>
                        <div className="flex items-center space-x-2 mb-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: player.color }}/>
                            <p className="text-xs font-semibold">{player.name}</p>
                        </div>
                        <div className={cn(
                            "flex flex-wrap gap-1 p-2 rounded-md min-h-[36px]",
                            (capturedPieces[player.id]?.length ?? 0) > 0 ? 'bg-muted/50' : 'bg-transparent'
                        )}>
                            {capturedPieces[player.id] && capturedPieces[player.id]!.length > 0 ? (
                                capturedPieces[player.id]!.map((piece, index) => (
                                    <CapturedPiece key={index} piece={piece} />
                                ))
                            ) : (
                                <p className="text-xs text-muted-foreground italic">No pieces captured yet.</p>
                            )}
                        </div>
                    </div>
                ))}
                </div>
            </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

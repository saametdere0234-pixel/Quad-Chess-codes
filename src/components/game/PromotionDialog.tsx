'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PIECE_EMOJIS } from '@/lib/game/constants';
import type { Player, PieceType } from '@/lib/game/types';

const PROMOTION_PIECES: PieceType[] = ['Queen', 'Rook', 'Bishop', 'Knight'];

interface PromotionDialogProps {
  player: Player;
  onSelectPiece: (pieceType: PieceType) => void;
}

export default function PromotionDialog({ player, onSelectPiece }: PromotionDialogProps) {
  return (
    <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Promote Pawn</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-around">
          {PROMOTION_PIECES.map((pieceType) => (
            <Button
              key={pieceType}
              variant="ghost"
              className="h-20 w-20 flex-col"
              onClick={() => onSelectPiece(pieceType)}
            >
              <span
                className="text-5xl"
                style={{
                  color: player.color,
                  WebkitTextStroke: '1px black',
                  paintOrder: 'stroke fill',
                }}
              >
                {PIECE_EMOJIS[player.id][pieceType]}
              </span>
              <span className="text-sm">{pieceType}</span>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

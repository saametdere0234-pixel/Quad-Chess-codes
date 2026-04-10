'use server';
/**
 * @fileOverview This file implements a Genkit flow for providing AI commentary on chess moves
 * in a 4-player King Hunt game.
 *
 * - getAITurnCommentary - A function that provides AI commentary on a player's move.
 * - AITurnCommentaryInput - The input type for the getAITurnCommentary function.
 * - AITurnCommentaryOutput - The return type for the getAITurnCommentary function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AITurnCommentaryInputSchema = z.object({
  boardState: z.array(z.array(z.string().describe('Chess piece emoji/text or empty string for an empty square'))).describe('The current state of the 14x14 chess board, including empty squares and 3x3 corner regions.'),
  lastMove: z.object({
    piece: z.string().describe('The emoji or text representation of the piece that was moved.'),
    fromRow: z.number().describe('The starting row of the moved piece (0-indexed).'),
    fromCol: z.number().describe('The starting column of the moved piece (0-indexed).'),
    toRow: z.number().describe('The destination row of the moved piece (0-indexed).'),
    toCol: z.number().describe('The destination column of the moved piece (0-indexed).'),
    capturedPiece: z.string().optional().describe('The emoji or text representation of the piece captured, if any.'),
  }).describe('Details about the move just made.'),
  currentPlayerId: z.string().describe('An identifier for the player who just made the move (e.g., "Player 1", "Red Player").'),
}).describe('Input for the AI turn commentary flow.');
export type AITurnCommentaryInput = z.infer<typeof AITurnCommentaryInputSchema>;

const AITurnCommentaryOutputSchema = z.string().describe('A brief, analytical comment (1-2 sentences) on the chess move.');
export type AITurnCommentaryOutput = z.infer<typeof AITurnCommentaryOutputSchema>;

export async function getAITurnCommentary(input: AITurnCommentaryInput): Promise<AITurnCommentaryOutput> {
  return aiTurnCommentaryFlow(input);
}

const aiTurnCommentaryPrompt = ai.definePrompt({
  name: 'aiTurnCommentaryPrompt',
  input: { schema: AITurnCommentaryInputSchema },
  output: { schema: AITurnCommentaryOutputSchema },
  prompt: `You are an analytical chess commentator for a unique 4-player 'King Hunt' chess game.
The game is played on a 14x14 grid in a plus-shaped layout where the 3x3 corners are empty and inactive.
The primary goal is to capture any opposing King. There are NO traditional check or checkmate rules.
A player is immediately eliminated from the game if their King is captured. The game ends when only one King remains.

Current board state (each line represents a row, '.' for empty squares, actual piece emojis/text otherwise):
{{#each boardState}}
  {{#each this}} {{this}} {{/each}}
{{/each}}

Player '{{{currentPlayerId}}}' just made the following move:
Moved '{{{lastMove.piece}}}' from (row:{{{lastMove.fromRow}}}, col:{{{lastMove.fromCol}}}) to (row:{{{lastMove.toRow}}}, col:{{{lastMove.toCol}}}).
{{#if lastMove.capturedPiece}}
  They captured '{{{lastMove.capturedPiece}}}'.
{{/if}}

Provide a brief, analytical comment (1-2 sentences) on this move from a King Hunt perspective.
Focus on tactical implications, potential King threats, changes to board control, or player elimination consequences.
Avoid using traditional chess terms like 'check', 'checkmate', 'stalemate', 'pawn promotion', etc., as they do not apply here.
Keep the comment concise and insightful.`,
});

const aiTurnCommentaryFlow = ai.defineFlow(
  {
    name: 'aiTurnCommentaryFlow',
    inputSchema: AITurnCommentaryInputSchema,
    outputSchema: AITurnCommentaryOutputSchema,
  },
  async (input) => {
    // For the board state in the prompt, let's replace empty strings with '.' for better readability.
    const formattedBoardState = input.boardState.map(row =>
      row.map(cell => (cell === '' ? '.' : cell))
    );

    const { output } = await aiTurnCommentaryPrompt({
      ...input,
      boardState: formattedBoardState, // Pass the formatted board state to the prompt
    });

    if (!output) {
      throw new Error('AI did not provide a commentary.');
    }
    return output;
  }
);

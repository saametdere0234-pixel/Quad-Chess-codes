'use server';

import { getAITurnCommentary, AITurnCommentaryInput } from '@/ai/flows/ai-turn-commentary';

export async function fetchAICommentary(input: AITurnCommentaryInput): Promise<string> {
  try {
    const commentary = await getAITurnCommentary(input);
    return commentary;
  } catch (error) {
    console.error("Error fetching AI commentary:", error);
    if (error instanceof Error) {
        return `AI commentary is unavailable: ${error.message}`;
    }
    return "AI commentary is currently unavailable.";
  }
}

import { CommandResult, createMessage } from "@/app/actions";
import type { Game, PlayerState } from "../types";

export function handleLook(state: PlayerState, game: Game, summary: string): CommandResult {
  const narratorName = game.narratorName || "Narrator";
  return { newState: state, messages: [createMessage('narrator', narratorName, summary.trim())] };
}

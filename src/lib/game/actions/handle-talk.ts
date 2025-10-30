
'use server';

import type { NpcId, Game, PlayerState, CommandResult } from "@/lib/game/types";
import { createMessage } from "@/lib/utils";
import { processEffects } from "@/lib/game/actions/process-effects";
import { normalizeName } from "@/lib/utils";

const examinedObjectFlag = (id: string) => `examined_${id}`;

export async function handleTalk(state: PlayerState, npcName: string, game: Game): Promise<CommandResult> {
    const location = game.locations[state.currentLocationId];
    const normalizedNpcName = normalizeName(npcName);

    const npc = Object.values(game.npcs)
        .find(n => n?.name && normalizeName(n.name).includes(normalizedNpcName) && location.npcs.includes(n.id));

    if (npc) {
        const effects = [
            { type: 'START_CONVERSATION' as const, npcId: npc.id },
            ...(npc.startConversationEffects || [])
        ];
        
        let { newState, messages } = await processEffects(state, effects, game);

        messages.unshift(createMessage('system', 'System', `You are now talking to ${npc.name}. Type your message to continue the conversation. To end the conversation, type 'goodbye'.`));
        
        const welcomeMessage = npc.welcomeMessage || "Hello.";
        
        const flag = examinedObjectFlag(npc.id);

        const npcMessage = createMessage(
            npc.id as NpcId,
            npc.name,
            `"${welcomeMessage}"`,
            'image',
            { id: npc.id, game, state: newState, showEvenIfExamined: false }
        );
        messages.push(npcMessage);

        if (!newState.flags.includes(flag as any)) {
            const flagEffectResult = await processEffects(newState, [{ type: 'SET_FLAG', flag: flag as any }], game);
            newState = flagEffectResult.newState;
        }

        return { newState, messages };
    }
    
    return { newState: state, messages: [createMessage('narrator', 'Narrator', `There is no one called "${normalizedNpcName}" here.`)] };
}

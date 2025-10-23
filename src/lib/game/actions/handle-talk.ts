

import { CommandResult } from "@/app/actions";
import type { Game, NpcId, PlayerState } from "../types";
import { createMessage, processEffects } from "./process-effects";

const examinedObjectFlag = (id: string) => `examined_${id}`;

export async function handleTalk(state: PlayerState, npcName: string, game: Game): Promise<CommandResult> {
    const location = game.locations[state.currentLocationId];
    const normalizedNpcName = npcName.toLowerCase().replace(/"/g, '').trim();

    const npc = Object.values(game.npcs)
        .find(n => n?.name.toLowerCase().includes(normalizedNpcName) && location.npcs.includes(n.id));

    if (npc) {
        let newState = { ...state, activeConversationWith: npc.id, interactingWithObject: null };
        let messages: any[] = [];
        
        const startEffects = npc.startConversationEffects || [];
        const effectResult = processEffects(newState, startEffects, game);
        newState = effectResult.newState!;
        messages.push(...effectResult.messages);

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
            newState.flags.push(flag as any);
        }

        return { newState, messages };
    }
    
    return { newState: state, messages: [createMessage('system', 'System', `There is no one called "${normalizedNpcName}" here.`)] };
}

import { generateNpcChatter, selectNpcResponse } from "@/ai";
import { CommandResult, createMessage } from "@/app/actions";
import type { Game, NPC, PlayerState } from "../types";
import { processActions } from "./process-actions";

const CONVERSATION_END_KEYWORDS = ['goodbye', 'bye', 'leave', 'stop', 'end', 'exit', 'thank you and goodbye'];

function isEndingConversation(input: string): boolean {
    const lowerInput = input.toLowerCase().trim();
    return CONVERSATION_END_KEYWORDS.some(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        return regex.test(lowerInput);
    });
}

async function handleFreeformChat(npc: NPC, state: PlayerState, playerInput: string, game: Game): Promise<CommandResult> {
    const chapter = game.chapters[state.currentChapterId];
    let newState = { ...state, conversationCounts: { ...state.conversationCounts } };
    newState.conversationCounts[npc.id] = (newState.conversationCounts[npc.id] || 0) + 1;

    const interactionCount = newState.conversationCounts[npc.id];
    if (npc.maxInteractions && interactionCount > npc.maxInteractions && npc.interactionLimitResponse) {
        return { newState, messages: [createMessage(npc.id, npc.name, `"${npc.interactionLimitResponse}"`)] };
    }

    const location = chapter.locations[state.currentLocationId];
    const { output: aiResponse, usage } = await generateNpcChatter({
        playerInput: playerInput,
        npcName: npc.name,
        npcPersona: npc.persona || 'A generic townsperson.',
        locationDescription: location.description,
        gameSetting: game.setting || 'Modern-day USA, 2025'
    });
    
    const message = createMessage(npc.id, npc.name, `"${aiResponse.npcResponse}"`, 'text', undefined, usage);
    return { newState, messages: [message] };
}


export async function handleConversation(state: PlayerState, playerInput: string, game: Game): Promise<CommandResult> {
    if (!state.activeConversationWith) {
        return { newState: state, messages: [createMessage('system', 'System', 'Error: Not in a conversation.')] };
    }

    const chapter = game.chapters[state.currentChapterId];
    const npcId = state.activeConversationWith;
    const npc = chapter.npcs[npcId];
    let newState = { ...state };

    if (isEndingConversation(playerInput)) {
        return processActions(newState, [{type: 'END_CONVERSATION'}], game);
    }
    
    const completionFlag = npc.completionFlag;
    const isQuestComplete = completionFlag && newState.flags.includes(completionFlag);

    // If the NPC's quest is complete AND they have a persona, they become a freeform chatterer.
    if (isQuestComplete && npc.dialogueType === 'scripted' && npc.persona) {
        return handleFreeformChat(npc, newState, playerInput, game);
    }

    // Handle SCRIPTED NPCs (or completed ones without a persona)
    if (npc.dialogueType === 'scripted') {
        if (isQuestComplete && npc.finalResponse) {
             return { newState, messages: [createMessage(npcId, npc.name, `"${npc.finalResponse}"`)] };
        }
        
        if (!npc.cannedResponses || npc.cannedResponses.length === 0) {
            return {
                newState: newState,
                messages: [createMessage(npcId, npc.name, `"${npc.goodbyeMessage || 'I have nothing more to say.'}"`)]
            };
        }

        const cannedResponsesForAI = npc.cannedResponses.map(r => ({ topic: r.topic, response: r.response, keywords: r.keywords }));
        const { output: aiResponse, usage } = await selectNpcResponse({
            playerInput: playerInput,
            npcName: npc.name,
            cannedResponses: cannedResponsesForAI,
        });
        
        const chosenTopic = aiResponse.topic;
        const selectedResponse = npc.cannedResponses.find(r => r.topic === chosenTopic)
            || npc.cannedResponses.find(r => r.topic === 'default');

        if (!selectedResponse) {
            return { newState, messages: [createMessage(npcId, npc.name, `"I don't know what to say."`)] };
        }

        const initialMessage = createMessage(npcId, npc.name, `"${selectedResponse.response}"`, 'text', undefined, usage);
        const actionsToProcess = selectedResponse.actions || [];
        let actionResult = processActions(newState, actionsToProcess, game);
        actionResult.messages.unshift(initialMessage);
        return actionResult;
    }

    // Handle FREEFORM NPCs
    if (npc.dialogueType === 'freeform') {
        return handleFreeformChat(npc, newState, playerInput, game);
    }

    // Fallback if dialogueType is not set
    return {
        newState: newState,
        messages: [createMessage(npcId, npc.name, `"${npc.goodbyeMessage || 'I have nothing to say.'}"`)]
    };
}

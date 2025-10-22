

import { generateNpcChatter, selectNpcResponse } from "@/ai";
import { CommandResult } from "@/app/actions";
import type { Game, NPC, NpcId, NpcState, PlayerState, Topic } from "../types";
import { createMessage, processActions } from "./process-actions";
import { getLiveNpc } from "./helpers";

const CONVERSATION_END_KEYWORDS = ['goodbye', 'bye', 'leave', 'stop', 'end', 'exit', 'thank you and goodbye'];

function isEndingConversation(input: string): boolean {
    const lowerInput = input.toLowerCase().trim();
    return CONVERSATION_END_KEYWORDS.some(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        return regex.test(lowerInput);
    });
}

function checkDemotion(npc: NPC, state: PlayerState): PlayerState {
    let liveNpcState = getLiveNpc(npc.id, state, npc);
    if (liveNpcState.stage === 'demoted' || !npc.demoteRules) {
        return state;
    }

    const { onFlagsAll, then } = npc.demoteRules;
    let shouldDemote = false;

    if (onFlagsAll && onFlagsAll.every(flag => state.flags.includes(flag))) {
        shouldDemote = true;
    }

    if (shouldDemote) {
        let newState = { ...state, npcStates: { ...state.npcStates } };
        newState.npcStates[npc.id] = { ...liveNpcState, stage: then.setStage, importance: then.setImportance };
        
        // This is a bit of a hack for now. In a full event system, this would be cleaner.
        const demotionResult = processActions(newState, [{ type: 'DEMOTE_NPC', npcId: npc.id }], { ...game, npcs: { [npc.id]: npc } });
        return demotionResult.newState;
    }
    
    return state;
}

async function handleFreeformChat(npc: NPC, state: PlayerState, playerInput: string, game: Game): Promise<CommandResult> {
    let newState = { ...state, npcStates: { ...state.npcStates } };
    let liveNpcState = getLiveNpc(npc.id, newState, npc);
    liveNpcState.interactionCount = (liveNpcState.interactionCount || 0) + 1;
    newState.npcStates[npc.id] = liveNpcState;

    if (npc.limits?.maxInteractions && liveNpcState.interactionCount > npc.limits.maxInteractions && npc.limits.interactionLimitResponse) {
        return { newState, messages: [createMessage(npc.id, npc.name, `"${npc.limits.interactionLimitResponse}"`)] };
    }

    const location = game.locations[state.currentLocationId];
    const { output: aiResponse, usage } = await generateNpcChatter({
        playerInput: playerInput,
        npcName: npc.name,
        npcPersona: npc.persona || 'A generic townsperson.',
        locationDescription: location.sceneDescription,
        gameSetting: game.setting || 'Modern-day USA, 2025'
    });
    
    const message = createMessage(npc.id, npc.name, `"${aiResponse.npcResponse}"`, 'text', undefined, usage);
    return { newState, messages: [message] };
}


async function handleScriptedChat(npc: NPC, state: PlayerState, playerInput: string, game: Game): Promise<CommandResult> {
    const liveNpcState = getLiveNpc(npc.id, state, npc);

    // If demoted, use the post-completion profile
    if (liveNpcState.stage === 'demoted' && npc.postCompletionProfile) {
        const message = npc.postCompletionProfile.defaultResponse || "I have nothing more to say.";
        return { newState: state, messages: [createMessage(npc.id, npc.name, `"${message}"`)] };
    }
    
    const availableTopics = (npc.topics || []).filter(topic => {
        const { conditions, once, topicId } = topic;
        if (once && liveNpcState.completedTopics.includes(topicId)) {
            return false; // Already completed
        }
        if (conditions?.requiredFlagsAll && !conditions.requiredFlagsAll.every(flag => state.flags.includes(flag))) {
            return false; // Missing required flags
        }
        if (conditions?.forbiddenFlagsAny && conditions.forbiddenFlagsAny.some(flag => state.flags.includes(flag))) {
            return false; // Has a forbidden flag
        }
        return true;
    });

    if (availableTopics.length === 0) {
        const fallback = npc.fallbacks?.noMoreHelp || npc.fallbacks?.default || "I have nothing more to say.";
        return { newState: state, messages: [createMessage(npc.id, npc.name, `"${fallback}"`)] };
    }

    // This is a simplified version of topic selection. A more robust version would use AI.
    const lowerInput = playerInput.toLowerCase();
    let selectedTopic: Topic | undefined;
    for (const topic of availableTopics) {
        if (topic.keywords.some(kw => lowerInput.includes(kw.toLowerCase()))) {
            selectedTopic = topic;
            break;
        }
    }
    
    if (!selectedTopic) {
        const fallback = npc.fallbacks?.offTopic || npc.fallbacks?.default || "I'm not sure what you mean by that.";
        return { newState: state, messages: [createMessage(npc.id, npc.name, `"${fallback}"`)] };
    }

    // Process the selected topic
    let newState = { ...state, npcStates: { ...state.npcStates } };
    if (selectedTopic.once) {
        const updatedNpcState = getLiveNpc(npc.id, newState, npc);
        updatedNpcState.completedTopics = [...updatedNpcState.completedTopics, selectedTopic.topicId];
        newState.npcStates[npc.id] = updatedNpcState;
    }
    
    const initialMessage = createMessage(npc.id, npc.name, `"${selectedTopic.response.message}"`);
    const actionsToProcess = selectedTopic.response.actions || [];
    let actionResult = processActions(newState, actionsToProcess, game);
    
    // Check for demotion after processing actions
    actionResult.newState = checkDemotion(npc, actionResult.newState);

    actionResult.messages.unshift(initialMessage);
    return actionResult;
}


export async function handleConversation(state: PlayerState, playerInput: string, game: Game): Promise<CommandResult> {
    if (!state.activeConversationWith) {
        return { newState: state, messages: [createMessage('system', 'System', 'Error: Not in a conversation.')] };
    }

    const npcId = state.activeConversationWith;
    const npc = game.npcs[npcId];
    let newState = checkDemotion(npc, { ...state });

    if (isEndingConversation(playerInput)) {
        return processActions(newState, [{type: 'END_CONVERSATION'}], game);
    }
    
    if (npc.dialogueType === 'scripted') {
        return handleScriptedChat(npc, newState, playerInput, game);
    }
    
    if (npc.dialogueType === 'freeform') {
        return handleFreeformChat(npc, newState, playerInput, game);
    }

    // Fallback if dialogueType is not set
    return {
        newState: newState,
        messages: [createMessage(npcId, npc.name, `"${npc.goodbyeMessage || 'I have nothing to say.'}"`)]
    };
}

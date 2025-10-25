'use server';

import { generateNpcChatter, selectNpcResponse } from "@/ai";
import type { Game, NPC, NpcId, NpcState, PlayerState, Topic, CommandResult } from "@/lib/game/types";
import { createMessage } from "@/lib/utils";
import { processEffects } from "@/lib/game/actions/process-effects";
import { getLiveNpc } from "@/lib/game/utils/helpers";

const CONVERSATION_END_KEYWORDS = ['goodbye', 'bye', 'leave', 'stop', 'end', 'exit', 'thank you and goodbye'];

function isEndingConversation(input: string): boolean {
    const lowerInput = input.toLowerCase().trim();
    return CONVERSATION_END_KEYWORDS.some(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        return regex.test(lowerInput);
    });
}

async function checkDemotion(npc: NPC, state: PlayerState, game: Game): Promise<PlayerState> {
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
        
        const demotionResult = await processEffects(newState, [{ type: 'DEMOTE_NPC', npcId: npc.id }], game);
        return demotionResult.newState;
    }
    
    return state;
}

async function handleFreeformChat(npc: NPC, state: PlayerState, playerInput: string, game: Game): Promise<CommandResult> {
    let newState = { ...state };
    let liveNpcState = getLiveNpc(npc.id, newState, npc);
    const newInteractionCount = (liveNpcState.interactionCount || 0) + 1;
    
    if (npc.limits?.maxInteractions && newInteractionCount > npc.limits.maxInteractions) {
        const limitMsg = npc.limits.interactionLimitResponse || "I really must be going now.";
        return { newState, messages: [createMessage(npc.id, npc.name, `"${limitMsg}"`)] };
    }
    
    newState.npcStates[npc.id] = { ...liveNpcState, interactionCount: newInteractionCount };

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

    if (liveNpcState.stage === 'demoted' && npc.postCompletionProfile) {
        const message = npc.postCompletionProfile.defaultResponse || "I have nothing more to say.";
        return { newState: state, messages: [createMessage(npc.id, npc.name, `"${message}"`)] };
    }
    
    const availableTopics = (npc.topics || []).filter(topic => {
        const { conditions, once, topicId } = topic;
        if (once && liveNpcState.completedTopics.includes(topicId)) {
            return false;
        }
        if (conditions?.requiredFlagsAll && !conditions.requiredFlagsAll.every(flag => state.flags.includes(flag))) {
            return false;
        }
        if (conditions?.forbiddenFlagsAny && conditions.forbiddenFlagsAny.some(flag => state.flags.includes(flag))) {
            return false;
        }
        return true;
    }).map(t => ({ topic: t.topicId, response: t.response.message, keywords: t.keywords.join(', ') }));

    if (availableTopics.length === 0) {
        const fallback = npc.fallbacks?.noMoreHelp || npc.fallbacks?.default || "I have nothing more to say.";
        return { newState: state, messages: [createMessage(npc.id, npc.name, `"${fallback}"`)] };
    }

    const { output: aiResponse, usage } = await selectNpcResponse({
        playerInput: playerInput,
        npcName: npc.name,
        cannedResponses: availableTopics
    });
    
    let newState = { ...state };
    const selectedTopic = npc.topics?.find(t => t.topicId === aiResponse.topic);

    if (!selectedTopic) {
        const fallback = npc.fallbacks?.offTopic || npc.fallbacks?.default || "I'm not sure what you mean by that.";
        return { newState: state, messages: [createMessage(npc.id, npc.name, `"${fallback}"`)] };
    }
    
    if (selectedTopic.once) {
        const updatedNpcState = getLiveNpc(npc.id, newState, npc);
        updatedNpcState.completedTopics = [...updatedNpcState.completedTopics, selectedTopic.topicId];
        newState.npcStates[npc.id] = updatedNpcState;
    }
    
    const initialMessage = createMessage(npc.id, npc.name, `"${selectedTopic.response.message}"`, 'text', undefined, usage);
    const effectsToProcess = selectedTopic.response.effects || [];
    let effectResult = await processEffects(newState, effectsToProcess, game);
    
    effectResult.newState = await checkDemotion(npc, effectResult.newState, game);

    effectResult.messages.unshift(initialMessage);
    return effectResult;
}


export async function handleConversation(state: PlayerState, playerInput: string, game: Game): Promise<CommandResult> {
    if (!state.activeConversationWith) {
        return { newState: state, messages: [createMessage('system', 'System', 'Error: Not in a conversation.')] };
    }

    const npcId = state.activeConversationWith;
    const npc = game.npcs[npcId];
    let newState = await checkDemotion(npc, { ...state }, game);

    if (isEndingConversation(playerInput)) {
        return await processEffects(newState, [{type: 'END_CONVERSATION'}], game);
    }
    
    if (npc.dialogueType === 'scripted') {
        return handleScriptedChat(npc, newState, playerInput, game);
    }
    
    if (npc.dialogueType === 'freeform') {
        return handleFreeformChat(npc, newState, playerInput, game);
    }

    return {
        newState: newState,
        messages: [createMessage(npcId, npc.name, `"${npc.goodbyeMessage || 'I have nothing to say.'}"`)]
    };
}
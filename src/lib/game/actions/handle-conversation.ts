
'use server';

import { generateNpcChatter, selectNpcResponse, contextualNpcConversation } from "@/ai";
import type { Flag, Game, NPC, NpcId, NpcState, PlayerState, Topic, CommandResult, Effect } from "@/lib/game/types";
import { createMessage } from "@/lib/utils";
import { processEffects } from "@/lib/game/actions/process-effects";
import { getLiveNpc } from "@/lib/game/utils/helpers";

const CONVERSATION_END_KEYWORDS = [
    'goodbye', 'good bye', 'bye', 'see you', 'see ya', 'cya', 'c u', 'later',
    'leave', 'stop', 'end', 'exit', 'quit', 'done',
    'thank you and goodbye', 'thanks bye', 'gotta go', 'gtg'
];

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

    // NEW: flags is now Record<string, boolean> instead of array
    if (onFlagsAll && onFlagsAll.every(flag => !!state.flags?.[flag])) {
        shouldDemote = true;
    }

    if (shouldDemote) {
        const { newState } = await processEffects(state, [{ type: 'DEMOTE_NPC', npcId: npc.id }], game);
        return newState;
    }

    return state;
}

async function handleFreeformChat(npc: NPC, state: PlayerState, playerInput: string, game: Game): Promise<CommandResult> {
    const { newState: stateAfterIncrement } = await processEffects(state, [{ type: 'INCREMENT_NPC_INTERACTION', npcId: npc.id }], game);
    
    const liveNpcState = getLiveNpc(npc.id, stateAfterIncrement, npc);
    
    if (npc.limits?.maxInteractions && liveNpcState.interactionCount > npc.limits.maxInteractions) {
        const limitMsg = npc.limits.interactionLimitResponse || "I really must be going now.";
        return { newState: stateAfterIncrement, messages: [createMessage(npc.id, npc.name, `"${limitMsg}"`)] };
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
    return { newState: stateAfterIncrement, messages: [message] };
}

/**
 * NEW: Handles contextual conversation with LLM-powered Type 1 NPCs
 * Uses conversation summary to save tokens and natural reveal conditions
 */
async function handleContextualChat(npc: NPC, state: PlayerState, playerInput: string, game: Game): Promise<CommandResult> {
    // Increment interaction count
    const { newState: stateAfterIncrement } = await processEffects(state, [{ type: 'INCREMENT_NPC_INTERACTION', npcId: npc.id }], game);
    const liveNpcState = getLiveNpc(npc.id, stateAfterIncrement, npc);

    // Check if completed (secret already revealed)
    const isCompleted = liveNpcState.stage === 'demoted' || !npc.secret;

    // Check interaction limit
    const maxInteractions = npc.conversationStages?.active.maxInteractions || 10;
    if (liveNpcState.interactionCount > maxInteractions) {
        const limitMsg = npc.limits?.interactionLimitResponse ||
                        npc.conversationStages?.completed.defaultResponse ||
                        "I really must be going now.";
        return { newState: stateAfterIncrement, messages: [createMessage(npc.id, npc.name, `"${limitMsg}"`)] };
    }

    // If completed, use brief responses
    if (isCompleted && npc.conversationStages?.completed) {
        const completedResponse = npc.conversationStages.completed.defaultResponse;
        return {
            newState: stateAfterIncrement,
            messages: [createMessage(npc.id, npc.name, `"${completedResponse}"`)]
        };
    }

    // Evaluate reveal conditions
    let revealConditionsMet = false;
    if (npc.secret && !isCompleted) {
        // IMPORTANT: Require at least 1 interaction before reveal
        // If player asks right question immediately (e.g., "do you have his contact?"), reveal it
        // Keywords are specific enough to prevent accidental reveals
        const minimumInteractionsForReveal = 1;

        if (liveNpcState.interactionCount >= minimumInteractionsForReveal) {
            const conditions = npc.secret.revealConditions.anyOf;

            for (const condition of conditions) {
                if (condition.type === 'TOPIC_MENTIONS') {
                    // Check if topic mentioned enough times in summary
                    const summary = liveNpcState.conversationSummary || '';
                    const topicMentions = (summary.match(new RegExp(condition.topic, 'gi')) || []).length;
                    if (topicMentions >= (condition.minCount || 1)) {
                        revealConditionsMet = true;
                        break;
                    }
                } else if (condition.type === 'KEYWORDS') {
                    // Check if player input contains keywords
                    const inputLower = playerInput.toLowerCase();
                    if (condition.keywords?.some(kw => inputLower.includes(kw.toLowerCase()))) {
                        revealConditionsMet = true;
                        break;
                    }
                } else if (condition.type === 'FLAG_SET') {
                    // Check if flag is set
                    if (stateAfterIncrement.flags?.[condition.flag]) {
                        revealConditionsMet = true;
                        break;
                    }
                }
            }
        }
    }

    console.log(`[CONTEXTUAL CHAT] NPC: ${npc.name}, Interaction: ${liveNpcState.interactionCount}/${maxInteractions}, Reveal: ${revealConditionsMet}`);
    console.log(`[CONTEXTUAL CHAT] Current summary: "${liveNpcState.conversationSummary || '(empty)'}"`);
    console.log(`[CONTEXTUAL CHAT] Player input: "${playerInput}"`);

    // Call AI flow for contextual conversation
    const { output: aiResponse, usage } = await contextualNpcConversation({
        playerInput,
        npcName: npc.name,
        npcPersona: npc.persona || npc.description,
        generalKnowledge: npc.contextualKnowledge?.general || [],
        topicKnowledge: npc.contextualKnowledge?.topic || [],
        secretInfo: npc.secret?.info || '',
        revealConditionsMet,
        conversationSummary: liveNpcState.conversationSummary || '',
        interactionCount: liveNpcState.interactionCount,
        maxInteractions,
        isCompleted,
        completedPersonality: npc.conversationStages?.completed.personality
    });

    // Build effects list
    const effects: Effect[] = [];

    // Update conversation summary
    console.log(`[CONTEXTUAL CHAT] 📝 New summary from AI: "${aiResponse.conversationSummary}"`);
    effects.push({
        type: 'UPDATE_CONVERSATION_SUMMARY',
        npcId: npc.id,
        summary: aiResponse.conversationSummary
    });

    // If secret was revealed, process reveal effects
    if (aiResponse.shouldReveal && npc.secret) {
        effects.push(...npc.secret.revealEffects);
        console.log(`[CONTEXTUAL CHAT] 🔓 Secret revealed by ${npc.name}!`);
    }

    // Process effects
    const { newState: finalState, messages: effectMessages } = await processEffects(stateAfterIncrement, effects, game);

    // Check for demotion after reveal
    const stateAfterDemotion = await checkDemotion(npc, finalState, game);

    // Create NPC response message
    const npcMessage = createMessage(npc.id, npc.name, `"${aiResponse.npcResponse}"`, 'text', undefined, usage);

    // Combine messages
    const allMessages = [npcMessage, ...effectMessages];

    return { newState: stateAfterDemotion, messages: allMessages };
}


async function handleScriptedChat(npc: NPC, state: PlayerState, playerInput: string, game: Game): Promise<CommandResult> {
    // First, increment interaction count
    const { newState: stateAfterIncrement } = await processEffects(state, [{ type: 'INCREMENT_NPC_INTERACTION', npcId: npc.id }], game);

    const liveNpcState = getLiveNpc(npc.id, stateAfterIncrement, npc);

    // DEBUG: Log interaction count
    console.log(`[CONVERSATION DEBUG] NPC: ${npc.name}, Interaction Count: ${liveNpcState.interactionCount}`);

    // Check if NPC is demoted (moved to Type 2 or completed)
    if (liveNpcState.stage === 'demoted' && npc.postCompletionProfile) {
        const message = npc.postCompletionProfile.defaultResponse || "I have nothing more to say.";
        return { newState: stateAfterIncrement, messages: [createMessage(npc.id, npc.name, `"${message}"`)] };
    }

    // PROGRESSIVE REVEALS: Check if new topics should be unlocked based on interaction count
    if (npc.progressiveReveals && liveNpcState.interactionCount > 0) {
        for (const reveal of npc.progressiveReveals) {
            // Check if this is the right interaction to trigger reveal
            if (reveal.triggerOnInteraction === liveNpcState.interactionCount) {
                // Check conditions (if any)
                let conditionsMet = true;
                if (reveal.conditions) {
                    conditionsMet = reveal.conditions.every(condition => {
                        if (condition.type === 'FLAG') {
                            return !!stateAfterIncrement.flags?.[condition.flag] === condition.value;
                        }
                        // Add more condition types as needed
                        return true;
                    });
                }

                // If conditions met, mark topic as newly available (via flag)
                if (conditionsMet) {
                    const revealFlag = `topic_revealed_${npc.id}_${reveal.topicId}` as Flag;
                    if (!stateAfterIncrement.flags?.[revealFlag]) {
                        console.log(`[CONVERSATION DEBUG] 🔓 Progressive Reveal triggered: ${reveal.topicId} at interaction ${liveNpcState.interactionCount}`);
                        const { newState: stateAfterReveal } = await processEffects(
                            stateAfterIncrement,
                            [{ type: 'SET_FLAG', flag: revealFlag, value: true }],
                            game
                        );
                        // Use the updated state for the rest of the conversation
                        Object.assign(stateAfterIncrement, stateAfterReveal);
                    }
                }
            }
        }
    }

    // Filter available topics (including newly revealed ones)
    const availableTopics = (npc.topics || []).filter(topic => {
        const { conditions, once, topicId } = topic;
        if (once && liveNpcState.completedTopics.includes(topicId)) {
            return false;
        }
        // NEW: flags is now Record<string, boolean> instead of array
        if (conditions?.requiredFlagsAll && !conditions.requiredFlagsAll.every(flag => !!stateAfterIncrement.flags?.[flag])) {
            return false;
        }
        if (conditions?.forbiddenFlagsAny && conditions.forbiddenFlagsAny.some(flag => !!stateAfterIncrement.flags?.[flag])) {
            return false;
        }
        return true;
    }).map(t => ({ topic: t.topicId, response: t.response.message, keywords: t.keywords.join(', ') }));

    // DEBUG: Log available topics
    console.log(`[CONVERSATION DEBUG] Available topics (${availableTopics.length}):`, availableTopics.map(t => t.topic).join(', '));

    if (availableTopics.length === 0) {
        const fallback = npc.fallbacks?.noMoreHelp || npc.fallbacks?.default || "I have nothing more to say.";
        return { newState: stateAfterIncrement, messages: [createMessage(npc.id, npc.name, `"${fallback}"`)] };
    }

    const { output: aiResponse, usage } = await selectNpcResponse({
        playerInput: playerInput,
        npcName: npc.name,
        cannedResponses: availableTopics
    });

    // DEBUG: Log AI selection
    console.log(`[CONVERSATION DEBUG] Player input: "${playerInput}"`);
    console.log(`[CONVERSATION DEBUG] AI selected topic: ${aiResponse.topic}`);

    const selectedTopic = npc.topics?.find(t => t.topicId === aiResponse.topic);

    if (!selectedTopic) {
        const fallback = npc.fallbacks?.offTopic || npc.fallbacks?.default || "I'm not sure what you mean by that.";
        return { newState: stateAfterIncrement, messages: [createMessage(npc.id, npc.name, `"${fallback}"`)] };
    }

    let effectsToProcess = [...(selectedTopic.response.effects || [])];

    if (selectedTopic.once) {
        effectsToProcess.push({ type: 'COMPLETE_NPC_TOPIC', npcId: npc.id, topicId: selectedTopic.topicId });
    }

    const initialMessage = createMessage(npc.id, npc.name, `"${selectedTopic.response.message}"`, 'text', undefined, usage);

    let { newState, messages } = await processEffects(stateAfterIncrement, effectsToProcess, game);

    const stateAfterDemotionCheck = await checkDemotion(npc, newState, game);
    newState = stateAfterDemotionCheck;

    messages.unshift(initialMessage);
    return { newState, messages };
}


export async function handleConversation(state: PlayerState, playerInput: string, game: Game): Promise<CommandResult> {
    if (!state.activeConversationWith) {
        return { newState: state, messages: [createMessage('system', 'System', 'Error: Not in a conversation.')] };
    }

    const npcId = state.activeConversationWith;
    const npc = game.npcs[npcId];
    let stateAfterDemotionCheck = await checkDemotion(npc, { ...state }, game);

    if (isEndingConversation(playerInput)) {
        const effects: Effect[] = [
            {
                type: 'SHOW_MESSAGE',
                speaker: npcId,
                senderName: npc.name,
                content: `"${npc.goodbyeMessage || 'Goodbye.'}"`,
                messageType: 'text'
            },
            {
                type: 'SHOW_MESSAGE',
                speaker: 'system',
                content: `You ended the conversation with ${npc.name}. Type your next command to continue.`
            },
            {
                type: 'END_CONVERSATION'
            }
        ];
        return await processEffects(stateAfterDemotionCheck, effects, game);
    }
    
    // NEW: Route to contextual chat if NPC has contextual knowledge defined
    if (npc.contextualKnowledge || npc.secret) {
        return handleContextualChat(npc, stateAfterDemotionCheck, playerInput, game);
    }

    if (npc.dialogueType === 'scripted') {
        return handleScriptedChat(npc, stateAfterDemotionCheck, playerInput, game);
    }

    if (npc.dialogueType === 'freeform') {
        return handleFreeformChat(npc, stateAfterDemotionCheck, playerInput, game);
    }

    return {
        newState: stateAfterDemotionCheck,
        messages: [createMessage(npcId, npc.name, `"${npc.goodbyeMessage || 'I have nothing to say.'}"`)]
    };
}

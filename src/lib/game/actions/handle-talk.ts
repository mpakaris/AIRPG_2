/**
 * handle-talk - NEW ARCHITECTURE
 *
 * Handles initiating conversations with NPCs.
 * REQUIRES PROXIMITY: Player must be focused on an object with nearbyNpcs or be in same location as NPC.
 *
 * Focus-based talk system:
 * - If player is focused on an object (e.g., counter), check nearbyNpcs property
 * - If no focus, check location.npcs for NPCs in the room
 * - This prevents "talk to barista" from working across the entire cafe
 */

'use server';

import type { NpcId, Game, PlayerState, Effect, GameObjectId } from "@/lib/game/types";
import { normalizeName } from "@/lib/utils";
import { matchesName } from "@/lib/game/utils/name-matching";

export async function handleTalk(state: PlayerState, npcName: string, game: Game): Promise<Effect[]> {
    const normalizedNpcName = normalizeName(npcName);
    const location = game.locations[state.currentLocationId];

    if (!normalizedNpcName) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: 'Who do you want to talk to?'
        }];
    }

    // PROXIMITY CHECK: Determine which NPCs are accessible based on focus
    let accessibleNpcIds: NpcId[] = [];

    if (state.currentFocusId && state.focusType === 'object') {
        // Player is focused on an object - check nearbyNpcs property
        const focusedObject = game.gameObjects[state.currentFocusId as GameObjectId];

        if (focusedObject?.nearbyNpcs && focusedObject.nearbyNpcs.length > 0) {
            accessibleNpcIds = focusedObject.nearbyNpcs;
        } else {
            // Focused on object without nearby NPCs
            return [{
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: `There's no one near the ${focusedObject?.name || 'object'} to talk to. You need to go to where people are.`
            }];
        }
    } else {
        // No focus - allow talking to any NPC in the location
        accessibleNpcIds = location.npcs || [];
    }

    if (accessibleNpcIds.length === 0) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: "There's no one here to talk to."
        }];
    }

    // MATCH NPC: Find best matching NPC using name-matching system
    let bestMatch: { npcId: NpcId; score: number } | null = null;

    for (const npcId of accessibleNpcIds) {
        const npc = game.npcs[npcId];
        if (!npc) continue;

        const result = matchesName(npc, normalizedNpcName);
        if (result.matches && (!bestMatch || result.score > bestMatch.score)) {
            bestMatch = { npcId, score: result.score };
        }
    }

    if (!bestMatch) {
        // NPC not found in accessible NPCs
        // Check if they're in the location but not accessible
        const npcInLocation = location.npcs.find(npcId => {
            const npc = game.npcs[npcId];
            return npc && matchesName(npc, normalizedNpcName).matches;
        });

        if (npcInLocation && !accessibleNpcIds.includes(npcInLocation)) {
            const npc = game.npcs[npcInLocation];
            return [{
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: `You can see ${npc.name} in the cafe, but you're not close enough to talk. Try going to where they are.`
            }];
        }

        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: `There's no one called "${npcName}" nearby.`
        }];
    }

    // NPC FOUND: Start conversation
    const npc = game.npcs[bestMatch.npcId];
    const effects: Effect[] = [];

    // Increment interaction count
    effects.push({
        type: 'INCREMENT_NPC_INTERACTION',
        npcId: npc.id
    });

    // Start conversation
    effects.push({
        type: 'START_CONVERSATION',
        npcId: npc.id
    });

    // Add any custom start conversation effects
    if (npc.startConversationEffects) {
        effects.push(...npc.startConversationEffects);
    }

    // System message
    effects.push({
        type: 'SHOW_MESSAGE',
        speaker: 'system',
        content: `You are now talking to ${npc.name}. Type your message to continue the conversation. To end the conversation, type 'goodbye'.`
    });

    // Welcome message from NPC
    const welcomeMessage = npc.welcomeMessage || "Hello.";
    effects.push({
        type: 'SHOW_MESSAGE',
        speaker: npc.id,
        senderName: npc.name,
        content: `"${welcomeMessage}"`,
        messageType: 'image',
        imageId: npc.id,
        imageEntityType: 'npc'
    });

    // Mark NPC as examined
    effects.push({
        type: 'SET_FLAG',
        flag: `examined_${npc.id}`,
        value: true
    });

    return effects;
}

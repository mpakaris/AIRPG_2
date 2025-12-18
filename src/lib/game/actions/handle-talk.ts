/**
 * handle-talk - NEW ARCHITECTURE
 *
 * Handles initiating conversations with NPCs.
 *
 * NPCs as Zones:
 * - NPCs are treated as focusable entities (zones of their own)
 * - "talk to X" searches all NPCs in the location (not just nearby)
 * - Automatically shifts focus to the NPC
 * - Shows transition message
 * - Starts conversation
 */

'use server';

import type { NpcId, Game, PlayerState, Effect, GameObjectId } from "@/lib/game/types";
import { FocusManager } from "@/lib/game/engine";
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

    // SEARCH ALL NPCs IN LOCATION: Check all revealed NPCs in current location
    const accessibleNpcIds = location.npcs || [];

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
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: `There's no one called "${npcName}" here.`
        }];
    }

    // NPC FOUND: Start conversation with transition
    const npc = game.npcs[bestMatch.npcId];
    const effects: Effect[] = [];

    // FIND WHERE NPC IS LOCATED: Search for objects that have this NPC in nearbyNpcs
    let npcLocation = '';
    for (const objId of location.objects) {
        const obj = game.gameObjects[objId];
        if (obj?.nearbyNpcs?.includes(npc.id)) {
            npcLocation = obj.name;
            break;
        }
    }

    // TRANSITION MESSAGE: Show where you're going to talk to them
    const transitionMessage = npcLocation
        ? `You make your way to the ${npcLocation} to talk to ${npc.name}.`
        : `You approach ${npc.name}.`;

    effects.push({
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: transitionMessage
    });

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

    // Welcome message from NPC with media
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
        flag: `examined_${npc.id}` as any,
        value: true
    });

    // CENTRALIZED FOCUS LOGIC: Determine focus after action completes
    const focusEffect = FocusManager.determineNextFocus({
        action: 'talk',
        target: npc.id,
        targetType: 'npc',
        actionSucceeded: true,
        currentFocus: state.currentFocusId,
        state,
        game
    });

    if (focusEffect) {
        effects.push(focusEffect);
    }

    return effects;
}

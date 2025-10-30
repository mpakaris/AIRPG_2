
/**
 * handle-read - NEW ARCHITECTURE
 *
 * Handles reading items (documents, books, etc.).
 * Supports stateMap for progressive content.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect } from "@/lib/game/types";
import { HandlerResolver, GameStateManager, VisibilityResolver, Validator, FocusResolver } from "@/lib/game/engine";
import { normalizeName } from "@/lib/utils";

export async function handleRead(state: PlayerState, itemName: string, game: Game): Promise<Effect[]> {
    const agentName = game.narratorName || "Agent Sharma";
    const normalizedItemName = normalizeName(itemName);

    if (!normalizedItemName) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: 'You need to specify what to read.'
        }];
    }

    // Helper function to check if name matches (including alternateNames and ID)
    const matchesName = (item: any, searchName: string): boolean => {
        // Try matching against the item name
        if (normalizeName(item.name).includes(searchName)) return true;

        // Try matching against alternate names
        if (item.alternateNames) {
            const matchesAlt = item.alternateNames.some((altName: string) =>
                normalizeName(altName).includes(searchName)
            );
            if (matchesAlt) return true;
        }

        // FALLBACK: Try matching against the item ID (for AI mistakes)
        // Check if searchName matches the item ID exactly or partially
        const itemIdNormalized = normalizeName(item.id);
        if (itemIdNormalized === searchName || itemIdNormalized.includes(searchName) || searchName.includes(itemIdNormalized)) {
            return true;
        }

        // Also try without the prefix and underscores
        const idWithoutPrefix = item.id.replace(/^item_/, '').replace(/_/g, '').toLowerCase();
        const searchWithoutPrefix = searchName.replace(/^item_/, '').replace(/_/g, '');
        if (idWithoutPrefix === searchWithoutPrefix || idWithoutPrefix.includes(searchWithoutPrefix) || searchWithoutPrefix.includes(idWithoutPrefix)) {
            return true;
        }

        return false;
    };

    // 1. Find item in inventory OR visible entities (ITEMS first, then OBJECTS)
    let itemId = state.inventory.find(id =>
        matchesName(game.items[id], normalizedItemName)
    );

    let entityToRead: any = null;
    let entityId: string | undefined = itemId;
    let entityType: 'item' | 'object' = 'item';

    // If not in inventory, check visible entities (items)
    if (!itemId) {
        const visibleEntities = VisibilityResolver.getVisibleEntities(state, game);
        itemId = visibleEntities.items.find(id =>
            matchesName(game.items[id as any], normalizedItemName)
        );
        if (itemId) {
            entityId = itemId;
            entityToRead = game.items[itemId];
            entityType = 'item';
        }
    } else {
        entityToRead = game.items[itemId];
        entityType = 'item';
    }

    // If still not found, check visible objects (like notebook, signs, etc.)
    if (!entityId) {
        const visibleEntities = VisibilityResolver.getVisibleEntities(state, game);
        const objectId = visibleEntities.objects.find(id =>
            matchesName(game.gameObjects[id as any], normalizedItemName)
        );
        if (objectId) {
            entityId = objectId;
            entityToRead = game.gameObjects[objectId as any];
            entityType = 'object';
        }
    }

    if (!entityId || !entityToRead) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'system',
            content: `You don't see a "${itemName}" to read here.`
        }];
    }

    // 2. Check if readable
    if (!entityToRead.capabilities?.readable && !entityToRead.capabilities?.isReadable) {
        return [{
            type: 'SHOW_MESSAGE',
            speaker: 'narrator',
            content: `There's nothing to read on the ${entityToRead.name}.`
        }];
    }

    // 3. Check for stateMap (progressive content)
    if (entityToRead.stateMap && Object.keys(entityToRead.stateMap).length > 0) {
        const entityState = GameStateManager.getEntityState(state, entityId);
        const currentReadCount = entityState.readCount || 0;
        const stateMapKeys = Object.keys(entityToRead.stateMap);

        // Check if all content has been read
        if (currentReadCount >= stateMapKeys.length) {
            return [{
                type: 'SHOW_MESSAGE',
                speaker: 'agent',
                content: `Come on Burt, let's continue. You can spend hours reading this book and not come up with anything useful.`
            }];
        }

        // Get current state entry
        const currentStateKey = stateMapKeys[currentReadCount];
        const stateMapEntry = entityToRead.stateMap[currentStateKey];

        if (!stateMapEntry || !stateMapEntry.description) {
            return [{
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: "You try to read it, but the text is illegible."
            }];
        }

        // Build effects: UPDATE STATE FIRST, then show message (so image shows "opened" state)
        return [
            {
                type: 'SET_ENTITY_STATE',
                entityId: entityId,
                patch: { readCount: currentReadCount + 1, currentStateId: 'opened' }
            },
            {
                type: 'SHOW_MESSAGE',
                speaker: 'narrator',
                content: stateMapEntry.description,
                messageType: 'image',
                imageId: entityId  // Will show "opened" image after state update
            }
        ];
    }

    // 4. Check for onRead handler
    const handler = HandlerResolver.getEffectiveHandler(entityToRead, 'read', state);
    if (handler) {
        // Evaluate conditions if they exist
        const conditionsMet = handler.conditions
            ? Validator.evaluateConditions(handler.conditions, state, game)
            : true;

        const outcome = conditionsMet ? handler.success : handler.fail;

        if (!outcome) {
            // No outcome defined, skip
        } else {
            const effects: Effect[] = [];

            // Set focus on the entity
            effects.push({
                type: 'SET_FOCUS',
                focusId: entityId,
                focusType: entityType === 'object' ? 'object' : 'item',
                transitionMessage: FocusResolver.getTransitionNarration(entityId, entityType === 'object' ? 'object' : 'item', state, game) || undefined
            });

            // Set state to 'opened' or 'unlocked' BEFORE showing message (for book/document/container images)
            // Note: Don't override if outcome.effects already sets currentStateId
            if (conditionsMet && (entityToRead.archetype === 'Book' || entityToRead.archetype === 'Document' || entityToRead.archetype === 'Container')) {
                // Check if outcome.effects already sets currentStateId
                const hasStateIdInEffects = outcome.effects?.some(
                    (e: any) => e.type === 'SET_ENTITY_STATE' && e.entityId === entityId && e.patch?.currentStateId
                );
                if (!hasStateIdInEffects) {
                    // Use 'unlocked' for containers, 'opened' for books/documents
                    const stateId = entityToRead.archetype === 'Container' ? 'unlocked' : 'opened';
                    const patch: any = { currentStateId: stateId };

                    // For containers, ensure isOpen remains true
                    if (entityToRead.archetype === 'Container') {
                        patch.isOpen = true;
                    }

                    effects.push({
                        type: 'SET_ENTITY_STATE',
                        entityId: entityId,
                        patch: patch
                    });
                }
            }

            // Add outcome effects first (if any)
            if (outcome.effects) {
                effects.push(...outcome.effects);
            }

            // Show message
            if (outcome.message) {
                effects.push({
                    type: 'SHOW_MESSAGE',
                    speaker: outcome.speaker || 'narrator',
                    content: outcome.message,
                    messageType: 'image',
                    imageId: entityId  // Will show "opened" image for books/documents
                });
            }

            return effects;
        }
    }

    // 5. Fallback: just show description
    return [{
        type: 'SHOW_MESSAGE',
        speaker: 'narrator',
        content: entityToRead.description,
        messageType: 'image',
        imageId: entityId
    }];
}

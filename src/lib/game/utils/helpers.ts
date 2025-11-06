
import type { Game, GameObject, GameObjectId, GameObjectState, Item, ItemId, ItemState, NPC, NpcId, NpcState, PlayerState, LocationId } from '@/lib/game/types';
import { normalizeName } from '@/lib/utils';
import { GameStateManager } from '@/lib/game/engine';

export function getLiveGameObject(id: GameObjectId, state: PlayerState, game: Game): {gameLogic: GameObject, state: GameObjectState} | null {
    const baseObject = game.gameObjects[id];
    if (!baseObject) return null;

    // Use unified world state (single source of truth)
    const worldState = GameStateManager.getEntityState(state, id);

    // Safely build the combined state with fallbacks for every property
    const combinedState: GameObjectState = {
        isLocked: typeof worldState.isLocked === 'boolean' ? worldState.isLocked : (baseObject.state?.isLocked ?? false),
        isOpen: typeof worldState.isOpen === 'boolean' ? worldState.isOpen : (baseObject.state?.isOpen ?? false),
        isBroken: typeof worldState.isBroken === 'boolean' ? worldState.isBroken : (baseObject.state?.isBroken ?? false),
        isMoved: typeof worldState.isMoved === 'boolean' ? worldState.isMoved : (baseObject.state?.isMoved ?? false),
        isPoweredOn: typeof worldState.isPoweredOn === 'boolean' ? worldState.isPoweredOn : (baseObject.state?.isPoweredOn ?? false),
        items: worldState.items ? [...worldState.items] : (baseObject.inventory?.items ? [...baseObject.inventory.items] : []),
        currentStateId: worldState.currentStateId || baseObject.state?.currentStateId,
    };

    return { gameLogic: baseObject, state: combinedState };
}

export function getLiveItem(id: ItemId, state: PlayerState, game: Game): { gameLogic: Item, state: ItemState } | null {
    const baseItem = game.items[id];
    if (!baseItem) return null;

    // Use unified world state (single source of truth)
    const worldState = GameStateManager.getEntityState(state, id);
    const baseState = baseItem.state || { readCount: 0, currentStateId: 'default' };

    const combinedState: ItemState = {
        readCount: worldState.readCount ?? baseState.readCount,
        currentStateId: worldState.currentStateId ?? baseState.currentStateId
    };

    return { gameLogic: baseItem, state: combinedState };
}


export function getLiveNpc(id: NpcId, state: PlayerState, baseNpc: NPC): NpcState {
    // Use unified world state (single source of truth)
    const worldState = GameStateManager.getEntityState(state, id);

    // Build NPC state with world state overrides
    return {
        stage: worldState.stage ?? baseNpc.initialState.stage,
        importance: worldState.importance ?? baseNpc.importance,
        trust: worldState.trust ?? baseNpc.initialState.trust,
        attitude: worldState.attitude ?? baseNpc.initialState.attitude,
        completedTopics: worldState.completedTopics ?? [],
        interactionCount: worldState.interactionCount ?? 0,
    };
}


export function findItemInContext(state: PlayerState, game: Game, targetName: string): { item: Item, source: { type: 'inventory' } | { type: 'object', id: GameObjectId } | { type: 'location', id: LocationId } } | null {
    const normalizedTargetName = normalizeName(targetName);

    const checkItem = (item: Item | undefined) => {
        if (!item) return false;
        const itemName = normalizeName(item.name);
        const itemTags = item.design?.tags?.map(normalizeName) || [];
        return itemName.includes(normalizedTargetName) || itemTags.includes(normalizedTargetName) || normalizedTargetName.includes(itemName);
    };

    // 1. Check inventory
    for (const itemId of state.inventory) {
        const item = game.items[itemId];
        if (checkItem(item)) {
            return { item, source: { type: 'inventory' } };
        }
    }

    // 2. Check items inside all visible objects in the current location
    const location = game.locations[state.currentLocationId];
    if (!location) return null;

    // Use base location objects, filter by visibility in world state
    for (const objId of location.objects) {
        const worldState = GameStateManager.getEntityState(state, objId);

        // Only check visible objects
        if (worldState.isVisible === false) continue;

        const liveObject = getLiveGameObject(objId, state, game);
        if (liveObject && liveObject.state.isOpen) {
            // Check the items currently in the object's live state
            const itemsInContainer = liveObject.state.items || [];
            for (const itemId of itemsInContainer) {
                const item = game.items[itemId];
                if (checkItem(item)) {
                    return { item, source: { type: 'object', id: objId } };
                }
            }
        }
    }

    return null;
}

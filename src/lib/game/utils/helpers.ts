
import type { Game, GameObject, GameObjectId, GameObjectState, Item, ItemId, ItemState, NPC, NpcId, NpcState, PlayerState, LocationId } from '@/lib/game/types';
import { normalizeName } from '@/lib/utils';

export function getLiveGameObject(id: GameObjectId, state: PlayerState, game: Game): {gameLogic: GameObject, state: GameObjectState} | null {
    const baseObject = game.gameObjects[id];
    if (!baseObject) return null;
    
    const liveState: GameObjectState | undefined = state.objectStates[id];

    // Safely build the combined state with fallbacks for every property
    const combinedState: GameObjectState = {
        isLocked: typeof liveState?.isLocked === 'boolean' ? liveState.isLocked : (baseObject.state?.isLocked ?? false),
        isOpen: typeof liveState?.isOpen === 'boolean' ? liveState.isOpen : (baseObject.state?.isOpen ?? false),
        isBroken: typeof liveState?.isBroken === 'boolean' ? liveState.isBroken : (baseObject.state?.isBroken ?? false),
        isPoweredOn: typeof liveState?.isPoweredOn === 'boolean' ? liveState.isPoweredOn : (baseObject.state?.isPoweredOn ?? false),
        items: liveState?.items ? [...liveState.items] : (baseObject.inventory?.items ? [...baseObject.inventory.items] : []),
        currentStateId: liveState?.currentStateId || baseObject.state?.currentStateId,
    };
    
    return { gameLogic: baseObject, state: combinedState };
}

export function getLiveItem(id: ItemId, state: PlayerState, game: Game): { gameLogic: Item, state: ItemState } | null {
    const baseItem = game.items[id];
    if (!baseItem) return null;

    const liveState = state.itemStates[id] || {};
    const baseState = baseItem.state || { readCount: 0, currentStateId: 'default' };
    
    const combinedState: ItemState = {
        readCount: liveState.readCount ?? baseState.readCount,
        currentStateId: liveState.currentStateId ?? baseState.currentStateId
    };

    return { gameLogic: baseItem, state: combinedState };
}


export function getLiveNpc(id: NpcId, state: PlayerState, baseNpc: NPC): NpcState {
    const liveState = state.npcStates[id];
    if (liveState) {
        return liveState;
    }
    // Fallback to initial state if not found (should not happen after initialization)
    return {
        stage: baseNpc.initialState.stage,
        importance: baseNpc.importance,
        trust: baseNpc.initialState.trust,
        attitude: baseNpc.initialState.attitude,
        completedTopics: [],
        interactionCount: 0,
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

    const visibleObjectIds = state.locationStates[state.currentLocationId]?.objects || location.objects;

    for (const objId of visibleObjectIds) {
        const liveObject = getLiveGameObject(objId, state, game);
        if (liveObject && liveObject.state.isOpen) {
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

    
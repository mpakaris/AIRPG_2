import type { Game, GameObject, GameObjectId, GameObjectState, Item, ItemId, PlayerState } from '../types';

export function getLiveGameObject(id: GameObjectId, state: PlayerState, game: Game): {gameLogic: GameObject, state: GameObjectState} | null {
    const chapter = game.chapters[state.currentChapterId];
    if (!chapter) return null;
    const baseObject = chapter.gameObjects[id];
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

export function findItemInContext(state: PlayerState, game: Game, targetName: string): Item | null {
    const chapter = game.chapters[state.currentChapterId];
    const location = chapter.locations[state.currentLocationId];
    const normalizedTargetName = targetName.toLowerCase().replace(/"/g, '').trim();

    // 1. Check inventory
    const itemInInventory = state.inventory
        .map(id => chapter.items[id])
        .find(item => item && item.name.toLowerCase().includes(normalizedTargetName));
    if (itemInInventory) {
        return itemInInventory;
    }

    // 2. Check items inside all open objects in the current location
    for (const objId of location.objects) {
         const liveObject = getLiveGameObject(objId, state, game);
         if (liveObject && liveObject.state.isOpen) {
            const itemsInContainer = liveObject.state.items || [];
            for (const itemId of itemsInContainer) {
                const item = chapter.items[itemId];
                if (item && item.name.toLowerCase().includes(normalizedTargetName)) {
                    return item;
                }
            }
         }
    }

    return null;
}

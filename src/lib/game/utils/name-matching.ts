/**
 * name-matching.ts
 *
 * Shared utility for intelligent name matching with location awareness.
 * Prioritizes exact matches and current location over fuzzy matches in other locations.
 */

import type { Game, PlayerState, GameObject, Item, GameObjectId, ItemId } from "@/lib/game/types";
import { normalizeName } from "@/lib/utils";

export type MatchResult = {
    matches: boolean;
    score: number;
};

/**
 * Scores how well a search term matches an entity's name.
 * Higher scores = better matches.
 *
 * @param entity - GameObject or Item to match against
 * @param searchName - Normalized search term
 * @returns Match result with score
 */
export function matchesName(entity: any, searchName: string): MatchResult {
    if (!entity) return { matches: false, score: 0 };

    const entityName = normalizeName(entity.name);

    // EXACT MATCH (highest priority)
    if (entityName === searchName) {
        return { matches: true, score: 100 };
    }

    // Check alternate names for exact match
    if (entity.alternateNames) {
        const exactAltMatch = entity.alternateNames.some((altName: string) =>
            normalizeName(altName) === searchName
        );
        if (exactAltMatch) return { matches: true, score: 90 };
    }

    // PARTIAL MATCH (lower priority)
    // Check both directions: entity contains search OR search contains entity
    if (entityName.includes(searchName)) {
        // Search term is substring of entity name (e.g., "safe" matches "wall safe")
        const score = 50 + (1 / entityName.length) * 10;
        return { matches: true, score };
    }

    if (searchName.includes(entityName)) {
        // Entity name is substring of search term (e.g., "the art of the deal" matches "book the art of the deal")
        const score = 45 + (1 / entityName.length) * 10;
        return { matches: true, score };
    }

    // Check alternate names for partial match (both directions)
    if (entity.alternateNames) {
        for (const altName of entity.alternateNames) {
            const normalizedAlt = normalizeName(altName);
            if (normalizedAlt.includes(searchName) || searchName.includes(normalizedAlt)) {
                return { matches: true, score: 40 };
            }
        }
    }

    // FALLBACK: Try matching against the entity ID (for AI mistakes)
    const entityIdNormalized = normalizeName(entity.id);
    if (entityIdNormalized === searchName) return { matches: true, score: 30 };
    if (entityIdNormalized.includes(searchName) || searchName.includes(entityIdNormalized)) {
        return { matches: true, score: 20 };
    }

    // Also try without the prefix and underscores
    const idWithoutPrefix = entity.id.replace(/^(item_|obj_|npc_)/, '').replace(/_/g, '').toLowerCase();
    const searchWithoutPrefix = searchName.replace(/^(item_|obj_|npc_)/, '').replace(/_/g, '');
    if (idWithoutPrefix === searchWithoutPrefix) return { matches: true, score: 25 };
    if (idWithoutPrefix.includes(searchWithoutPrefix) || searchWithoutPrefix.includes(idWithoutPrefix)) {
        return { matches: true, score: 15 };
    }

    return { matches: false, score: 0 };
}

/**
 * Checks if an entity is in the player's current location.
 * Items in inventory are always considered "with player" in current location.
 *
 * @param entityId - Entity ID to check
 * @param entityType - Type of entity ('item' or 'object')
 * @param state - Current player state
 * @param game - Game data
 * @returns true if entity is in current location
 */
export function isInCurrentLocation(
    entityId: string,
    entityType: 'item' | 'object',
    state: PlayerState,
    game: Game
): boolean {
    const currentLocationId = state.currentLocationId;
    const currentLocation = game.locations[currentLocationId];

    if (entityType === 'object') {
        // Objects are referenced by Location.objects[] array
        return currentLocation?.objects?.includes(entityId as GameObjectId) || false;
    } else {
        // Items in inventory are considered "with you" in current location
        if (state.inventory.includes(entityId as ItemId)) return true;

        // Items have placement.locationId
        const item = game.items[entityId as ItemId];
        return item?.placement?.locationId === currentLocationId;
    }
}

export type BestMatch = {
    id: string;
    category: 'inventory' | 'visible-item' | 'object';
    score: number;
    inCurrentLocation: boolean;
} | null;

/**
 * Finds the best matching entity with location awareness.
 * Prioritizes entities in current location over those in other locations.
 *
 * PRIORITY:
 * 1. Current location - exact match (score + 1000)
 * 2. Current location - fuzzy match (score + 1000)
 * 3. Other location - exact match (score)
 * 4. Other location - fuzzy match (score)
 *
 * @param searchName - Normalized search term
 * @param state - Current player state
 * @param game - Game data
 * @param options - Search options (which categories to search)
 * @returns Best matching entity or null
 */
export function findBestMatch(
    searchName: string,
    state: PlayerState,
    game: Game,
    options: {
        searchInventory?: boolean;
        searchVisibleItems?: boolean;
        searchObjects?: boolean;
    } = { searchInventory: true, searchVisibleItems: true, searchObjects: true }
): BestMatch {
    const visibleEntities = { items: [], objects: [] } as { items: string[]; objects: string[] };

    // Get visible entities if needed
    if (options.searchVisibleItems || options.searchObjects) {
        const { VisibilityResolver } = require("@/lib/game/engine");
        const visible = VisibilityResolver.getVisibleEntities(state, game);
        visibleEntities.items = visible.items;
        visibleEntities.objects = visible.objects;

        // ALSO add personal objects (they're always accessible but filtered from visibility)
        if (options.searchObjects) {
            for (const objectId in game.gameObjects) {
                const obj = game.gameObjects[objectId as GameObjectId];
                if (obj?.personal === true && !visibleEntities.objects.includes(objectId)) {
                    visibleEntities.objects.push(objectId);
                }
            }
        }
    }

    let bestMatch: BestMatch = null;

    // Helper to update best match with location awareness
    const updateBestMatch = (
        id: string,
        category: 'inventory' | 'visible-item' | 'object',
        score: number,
        inCurrentLoc: boolean
    ) => {
        // Add location boost: +1000 if in current location
        const effectiveScore = inCurrentLoc ? score + 1000 : score;
        const currentBestScore = bestMatch
            ? (bestMatch.inCurrentLocation ? bestMatch.score + 1000 : bestMatch.score)
            : -1;

        if (effectiveScore > currentBestScore) {
            bestMatch = { id, category, score, inCurrentLocation: inCurrentLoc };
        }
    };

    // 1. Search inventory items (always "in current location" with player)
    if (options.searchInventory) {
        for (const id of state.inventory) {
            const result = matchesName(game.items[id], searchName);
            if (result.matches) {
                updateBestMatch(id, 'inventory', result.score, true);
            }
        }
    }

    // 2. Search visible items (not in inventory)
    if (options.searchVisibleItems) {
        for (const id of visibleEntities.items) {
            if (!state.inventory.includes(id as ItemId)) {
                const result = matchesName(game.items[id as ItemId], searchName);
                if (result.matches) {
                    const inCurrentLoc = isInCurrentLocation(id, 'item', state, game);
                    updateBestMatch(id, 'visible-item', result.score, inCurrentLoc);
                }
            }
        }
    }

    // 3. Search objects
    if (options.searchObjects) {
        if (searchName.includes('painting')) {
            console.log('[name-matching] DEBUG: Searching for', searchName, 'in visible objects:', visibleEntities.objects);
        }
        for (const id of visibleEntities.objects) {
            const result = matchesName(game.gameObjects[id as GameObjectId], searchName);
            if (id === 'obj_painting' || searchName.includes('painting')) {
                console.log('[name-matching] Checking object:', id, 'name:', game.gameObjects[id as GameObjectId]?.name, 'against search:', searchName, 'result:', result);
            }
            if (result.matches) {
                const inCurrentLoc = isInCurrentLocation(id, 'object', state, game);
                updateBestMatch(id, 'object', result.score, inCurrentLoc);
            }
        }
    }

    return bestMatch;
}

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
    // BUT: Prevent tiny substring matches (e.g., "art" matching "article")
    // AND: Prevent compound word mismatches (e.g., "book" matching "bookshelf")
    // Require BOTH strings to be >= 4 chars for substring matching

    if (entityName.length >= 4 && searchName.length >= 4) {
        // Check if search term is a proper substring (with word boundaries)
        // "safe" should match "wall safe" but "book" should NOT match "bookshelf"
        if (entityName.includes(searchName)) {
            // Check if it's a word boundary match (space before/after or at start/end)
            const index = entityName.indexOf(searchName);
            const beforeChar = index > 0 ? entityName[index - 1] : ' ';
            const afterChar = index + searchName.length < entityName.length ? entityName[index + searchName.length] : ' ';

            // Only match if there's a word boundary (space or start/end)
            if (beforeChar === ' ' || afterChar === ' ' || beforeChar === '-' || afterChar === '-') {
                // Search term is substring of entity name (e.g., "safe" matches "wall safe")
                const score = 50 + (1 / entityName.length) * 10;
                return { matches: true, score };
            }
        }

        if (searchName.includes(entityName)) {
            // Check word boundary for entity name in search term
            const index = searchName.indexOf(entityName);
            const beforeChar = index > 0 ? searchName[index - 1] : ' ';
            const afterChar = index + entityName.length < searchName.length ? searchName[index + entityName.length] : ' ';

            // Only match if there's a word boundary
            if (beforeChar === ' ' || afterChar === ' ' || beforeChar === '-' || afterChar === '-') {
                // Entity name is substring of search term (e.g., "book" matches "book the art of the deal")
                const score = 45 + (1 / entityName.length) * 10;
                return { matches: true, score };
            }
        }
    }

    // Check alternate names for partial match (both directions)
    // Use word-based matching to prevent false matches (e.g., "art" in "article")
    if (entity.alternateNames) {
        for (const altName of entity.alternateNames) {
            const normalizedAlt = normalizeName(altName);

            // Check if any word from altName matches any word from search
            // Split the ORIGINAL strings (before normalization) to preserve word boundaries
            const altWords = altName.toLowerCase().trim().split(/\s+/);

            // For search, we need to reconstruct words from the original input
            // Since searchName is already normalized (no spaces), we compare against each alt word
            let hasWordMatch = false;

            for (const altWord of altWords) {
                const normalizedAltWord = normalizeName(altWord);

                // Exact word match (e.g., "key" === "key")
                if (normalizedAltWord === searchName) {
                    hasWordMatch = true;
                    break;
                }

                // Substring match: BOTH must be >= 4 chars to prevent "art" matching "article"
                if (normalizedAltWord.length >= 4 && searchName.length >= 4) {
                    if (normalizedAltWord.includes(searchName) || searchName.includes(normalizedAltWord)) {
                        hasWordMatch = true;
                        break;
                    }
                }
            }

            if (hasWordMatch) {
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
 * Finds the best matching entity with focus and location awareness.
 * Prioritizes entities in current focus over inventory and location.
 *
 * PRIORITY:
 * 1. Current focus - entities inside focused container (score + 2000) - HIGHEST
 * 2. Current location / inventory (score + 1000) - HIGH
 * 3. Other visible entities (base score) - MEDIUM
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
        requireFocus?: boolean;  // If true, ONLY search within current focus (+ inventory)
    } = { searchInventory: true, searchVisibleItems: true, searchObjects: true, requireFocus: false }
): BestMatch {
    // Debug: log search for door
    if (searchName.includes('door')) {
        console.log('[findBestMatch] Searching for:', searchName);
        console.log('[findBestMatch] Current focus:', state.currentFocusId);
        console.log('[findBestMatch] Options:', options);
    }

    const visibleEntities = { items: [], objects: [] } as { items: string[]; objects: string[] };

    // Get entities in current focus (if any)
    let entitiesInFocus = { items: [] as string[], objects: [] as string[] };
    if (state.currentFocusId) {
        const { GameStateManager } = require("@/lib/game/engine");

        // IMPORTANT: Include the focused entity itself!
        // Players should be able to interact with what they're focused on
        if (game.items[state.currentFocusId as ItemId]) {
            entitiesInFocus.items.push(state.currentFocusId);
        } else if (game.gameObjects[state.currentFocusId as GameObjectId]) {
            entitiesInFocus.objects.push(state.currentFocusId);
        }

        // Get ALL descendants of focused entity (including grandchildren)
        // This is needed for items that have items as children (e.g., note inside book)
        const getAllDescendants = (parentId: string): string[] => {
            const children = GameStateManager.getChildren(state, parentId);
            const allDescendants: string[] = [...children];

            // Recursively get descendants of each child
            for (const childId of children) {
                const grandchildren = getAllDescendants(childId);
                allDescendants.push(...grandchildren);
            }

            return allDescendants;
        };

        const allDescendants = getAllDescendants(state.currentFocusId);

        // Debug: log children for bookshelf
        if (state.currentFocusId === 'obj_bookshelf') {
            console.log('[findBestMatch] Bookshelf descendants:', allDescendants);
            console.log('[findBestMatch] Bookshelf state:', GameStateManager.getEntityState(state, 'obj_bookshelf'));
        }

        for (const childId of allDescendants) {
            if (game.items[childId as ItemId]) {
                entitiesInFocus.items.push(childId);
            } else if (game.gameObjects[childId as GameObjectId]) {
                entitiesInFocus.objects.push(childId);
            }
        }

        // IMPORTANT: If focused entity has a parent, also include parent and siblings
        // This allows interacting with siblings when focused on a child
        // Example: focused on drawer → can also access coffee machine (sibling)
        const parentId = GameStateManager.getParent(state, state.currentFocusId);
        if (parentId) {
            // Add parent to focus
            if (game.items[parentId as ItemId]) {
                entitiesInFocus.items.push(parentId);
            } else if (game.gameObjects[parentId as GameObjectId]) {
                entitiesInFocus.objects.push(parentId);
            }

            // Add all siblings (other children of the same parent)
            const siblings = GameStateManager.getChildren(state, parentId);
            for (const siblingId of siblings) {
                if (siblingId !== state.currentFocusId) { // Don't add self again
                    if (game.items[siblingId as ItemId]) {
                        if (!entitiesInFocus.items.includes(siblingId)) {
                            entitiesInFocus.items.push(siblingId);
                        }
                    } else if (game.gameObjects[siblingId as GameObjectId]) {
                        if (!entitiesInFocus.objects.includes(siblingId)) {
                            entitiesInFocus.objects.push(siblingId);
                        }
                    }
                }
            }
        }

        // Debug: log entities in focus
        if (state.currentFocusId === 'obj_bookshelf') {
            console.log('[findBestMatch] Entities in focus:', entitiesInFocus);
        }
    }

    // If requireFocus is true AND we have a focus, ONLY search focus + inventory
    if (options.requireFocus && state.currentFocusId) {
        // Strict focus mode: only search within focus boundaries
        // This includes the focused entity itself + its children
        visibleEntities.items = entitiesInFocus.items;
        visibleEntities.objects = entitiesInFocus.objects;

        // Debug: log for door searches
        if (searchName.includes('door')) {
            console.log('[findBestMatch] Focus mode - searching:', visibleEntities);
        }
    } else {
        // Normal mode: search all visible entities
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
    }

    let bestMatch: BestMatch = null;

    // Helper to check if entity is in current focus
    const isInFocus = (id: string): boolean => {
        return entitiesInFocus.items.includes(id) || entitiesInFocus.objects.includes(id);
    };

    // Helper to update best match with focus and location awareness
    const updateBestMatch = (
        id: string,
        category: 'inventory' | 'visible-item' | 'object',
        score: number,
        inCurrentLoc: boolean
    ) => {
        // Priority boost logic:
        // +2000 if in current focus (highest priority - beats inventory)
        // +1000 if in current location or inventory
        // +0 otherwise
        let effectiveScore = score;
        if (isInFocus(id)) {
            effectiveScore += 2000; // HIGHEST PRIORITY
        } else if (inCurrentLoc) {
            effectiveScore += 1000; // HIGH PRIORITY
        }

        const currentBestScore = bestMatch ? (() => {
            let score = bestMatch.score;
            if (isInFocus(bestMatch.id)) {
                score += 2000;
            } else if (bestMatch.inCurrentLocation) {
                score += 1000;
            }
            return score;
        })() : -1;

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
        for (const id of visibleEntities.objects) {
            const result = matchesName(game.gameObjects[id as GameObjectId], searchName);
            if (result.matches) {
                const inCurrentLoc = isInCurrentLocation(id, 'object', state, game);
                updateBestMatch(id, 'object', result.score, inCurrentLoc);
            }
        }
    }

    return bestMatch;
}

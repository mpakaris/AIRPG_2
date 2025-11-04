/**
 * FocusResolver - NEW ARCHITECTURE
 *
 * Handles focus-aware entity matching for the "island" system.
 * When a player is focused on an entity (container, object, NPC),
 * searches are scoped to that entity and its children first.
 */

import type { Game, PlayerState, ItemId, GameObjectId, NpcId } from "@/lib/game/types";
import { normalizeName } from "@/lib/utils";
import { VisibilityResolver } from "./VisibilityResolver";
import { GameStateManager } from "./GameStateManager";

export type EntityMatch = {
    id: string;
    type: 'item' | 'object' | 'npc';
    foundInFocus: boolean; // True if found within current focus, false if global
};

export class FocusResolver {
    /**
     * Helper function for robust name matching
     * Matches against name, alternateNames, and entity ID
     */
    static matchesName(entity: any, searchName: string): boolean {
        if (!entity) return false;

        const normalizedSearch = normalizeName(searchName);

        // Try matching against the entity name
        if (normalizeName(entity.name).includes(normalizedSearch)) return true;

        // Try matching against alternate names
        if (entity.alternateNames) {
            const matchesAlt = entity.alternateNames.some((altName: string) =>
                normalizeName(altName).includes(normalizedSearch)
            );
            if (matchesAlt) return true;
        }

        // FALLBACK: Try matching against the entity ID (for AI mistakes)
        const entityIdNormalized = normalizeName(entity.id);
        if (entityIdNormalized === normalizedSearch ||
            entityIdNormalized.includes(normalizedSearch) ||
            normalizedSearch.includes(entityIdNormalized)) {
            return true;
        }

        // Also try without the prefix and underscores
        const idWithoutPrefix = entity.id.replace(/^(item_|obj_|npc_)/, '').replace(/_/g, '').toLowerCase();
        const searchWithoutPrefix = normalizedSearch.replace(/^(item_|obj_|npc_)/, '').replace(/_/g, '');
        if (idWithoutPrefix === searchWithoutPrefix ||
            idWithoutPrefix.includes(searchWithoutPrefix) ||
            searchWithoutPrefix.includes(idWithoutPrefix)) {
            return true;
        }

        return false;
    }

    /**
     * Find entities that are children of the focused entity
     * (e.g., items inside a container, objects attached to an object)
     */
    static getEntitiesInFocus(state: PlayerState, game: Game): {
        items: string[];
        objects: string[];
    } {
        if (!state.currentFocusId) {
            return { items: [], objects: [] };
        }

        const focusId = state.currentFocusId;
        const focusType = state.focusType;

        const items: string[] = [];
        const objects: string[] = [];

        // Get all visible entities
        const visible = VisibilityResolver.getVisibleEntities(state, game);

        // Filter to only entities whose parent is the focused entity
        for (const itemId of visible.items) {
            const parent = VisibilityResolver.findParent(itemId, state);
            if (parent === focusId) {
                items.push(itemId);
            }
        }

        for (const objId of visible.objects) {
            const parent = VisibilityResolver.findParent(objId, state);
            if (parent === focusId) {
                objects.push(objId);
            }
        }

        // If focus is on an item in inventory, that item itself is "in focus"
        if (focusType === 'item' && state.inventory.includes(focusId as any)) {
            if (!items.includes(focusId)) {
                items.push(focusId);
            }
        }

        // If focus is on an object, that object itself is "in focus"
        if (focusType === 'object' && visible.objects.includes(focusId as any)) {
            if (!objects.includes(focusId)) {
                objects.push(focusId);
            }
        }

        return { items, objects };
    }

    /**
     * Find an entity with focus-aware scoping
     *
     * Search priority:
     * 1. If player has focus, search within focused entity and its children first
     * 2. Then search inventory
     * 3. Then search all visible entities globally
     *
     * This solves ambiguity issues like "justice" matching both:
     * - Book title "Justice for my love" (global)
     * - Notebook password "justice" (inside focused notebook)
     */
    static findEntity(
        targetName: string,
        state: PlayerState,
        game: Game,
        options?: {
            searchInventory?: boolean; // Default true
            searchVisible?: boolean;    // Default true
            requireFocus?: boolean;     // If true, ONLY search in focus (not globally)
        }
    ): EntityMatch | null {
        const normalizedTarget = normalizeName(targetName);
        const opts = {
            searchInventory: options?.searchInventory !== false,
            searchVisible: options?.searchVisible !== false,
            requireFocus: options?.requireFocus === true
        };

        // 1. If player has focus, search within focus FIRST
        if (state.currentFocusId) {
            const focusedEntities = this.getEntitiesInFocus(state, game);

            // Check items in focus
            const focusedItemId = focusedEntities.items.find(id =>
                this.matchesName(game.items[id as ItemId], normalizedTarget)
            );
            if (focusedItemId) {
                return {
                    id: focusedItemId,
                    type: 'item',
                    foundInFocus: true
                };
            }

            // Check objects in focus
            const focusedObjectId = focusedEntities.objects.find(id =>
                this.matchesName(game.gameObjects[id as GameObjectId], normalizedTarget)
            );
            if (focusedObjectId) {
                return {
                    id: focusedObjectId,
                    type: 'object',
                    foundInFocus: true
                };
            }

            // If requireFocus is true, don't search globally
            if (opts.requireFocus) {
                return null;
            }
        }

        // 2. Search inventory (if not requiring focus or no focus set)
        if (opts.searchInventory && !opts.requireFocus) {
            const itemId = state.inventory.find(id =>
                this.matchesName(game.items[id], normalizedTarget)
            );
            if (itemId) {
                return {
                    id: itemId,
                    type: 'item',
                    foundInFocus: false
                };
            }
        }

        // 3. Search all visible entities globally (if not requiring focus)
        if (opts.searchVisible && !opts.requireFocus) {
            const visible = VisibilityResolver.getVisibleEntities(state, game);

            // Check visible items (not in inventory)
            const visibleItemId = visible.items.find(id =>
                !state.inventory.includes(id as any) &&
                this.matchesName(game.items[id as ItemId], normalizedTarget)
            );
            if (visibleItemId) {
                return {
                    id: visibleItemId,
                    type: 'item',
                    foundInFocus: false
                };
            }

            // Check visible objects
            const visibleObjectId = visible.objects.find(id =>
                this.matchesName(game.gameObjects[id as GameObjectId], normalizedTarget)
            );
            if (visibleObjectId) {
                return {
                    id: visibleObjectId,
                    type: 'object',
                    foundInFocus: false
                };
            }
        }

        return null;
    }

    /**
     * Get a transition message when focus changes
     * First checks for location-specific atmospheric templates, then falls back to generic ones
     */
    static getTransitionNarration(
        newFocusId: string,
        newFocusType: 'item' | 'object' | 'npc',
        state: PlayerState,
        game: Game
    ): string | null {
        // Only show transition if focus actually changed
        if (state.currentFocusId === newFocusId) {
            return null;
        }

        // Skip transitions for personal equipment (phone, badge, etc.) - they're always "with you"
        if (newFocusType === 'object') {
            const obj = game.gameObjects[newFocusId as GameObjectId];
            if (obj?.personal === true) {
                return null;
            }
        }

        // Skip transitions for objects that are children of other objects (already within reach)
        // e.g., SD card inside notebook - you don't "walk toward" a small card
        const entityState = GameStateManager.getEntityState(state, newFocusId);
        if (entityState.parentId) {
            return null; // It's inside something, no physical movement needed
        }

        // Get entity name
        let entityName: string;
        switch (newFocusType) {
            case 'item':
                entityName = game.items[newFocusId as ItemId]?.name || 'it';
                break;
            case 'object':
                entityName = game.gameObjects[newFocusId as GameObjectId]?.name || 'it';
                break;
            case 'npc':
                entityName = game.npcs?.[newFocusId as NpcId]?.name || 'them';
                break;
        }

        // Try location-specific templates first
        const location = game.locations[state.currentLocationId];
        if (location?.transitionTemplates && location.transitionTemplates.length > 0) {
            const template = location.transitionTemplates[Math.floor(Math.random() * location.transitionTemplates.length)];
            return template.replace('{entity}', entityName);
        }

        // Fall back to generic templates based on entity type
        if (newFocusType === 'npc') {
            const npcTemplates = [
                `You approach ${entityName}.`,
                `You walk up to ${entityName}.`,
                `You step closer to ${entityName}.`,
                `You turn your attention to ${entityName}.`,
                `You move toward ${entityName}.`,
                `You head over to ${entityName}.`
            ];
            return npcTemplates[Math.floor(Math.random() * npcTemplates.length)];
        } else if (newFocusType === 'object') {
            const objectTemplates = [
                `You walk over to ${entityName}.`,
                `You step up to ${entityName}.`,
                `You move closer to ${entityName}.`,
                `You approach ${entityName}.`,
                `You turn your attention to ${entityName}.`,
                `You shift your focus to ${entityName}.`,
                `You head over to ${entityName}.`,
                `You make your way to ${entityName}.`,
                `You move toward ${entityName}.`,
                `You direct your attention to ${entityName}.`,
                `You position yourself at ${entityName}.`,
                `You go over to ${entityName}.`,
                `You cross over to ${entityName}.`,
                `You focus on ${entityName}.`,
                `You concentrate on ${entityName}.`,
                `You turn to ${entityName}.`,
                `You orient yourself toward ${entityName}.`,
                `You get closer to ${entityName}.`
            ];
            return objectTemplates[Math.floor(Math.random() * objectTemplates.length)];
        } else {
            // Items - usually examined in hand or picked up
            return null; // Items don't typically need transition narration
        }
    }

    /**
     * Get a helpful error message when an action can't be performed due to focus
     * Explains current focus and how to change it
     */
    static getOutOfFocusMessage(
        action: string,
        targetName: string,
        currentFocusId: string | undefined,
        game: Game
    ): string {
        if (!currentFocusId) {
            // No current focus - generic message
            const templates = [
                `I can't ${action} ${targetName} from here, Burt. You'll need to move closer first.`,
                `${targetName} is out of reach, Burt. Try moving to it first.`,
                `You'll need to get closer to ${targetName} to ${action} it, Burt.`,
                `I can't ${action} ${targetName} from this distance. Move over to it first.`,
                `${targetName} is too far away to ${action}. Try approaching it first.`
            ];
            return templates[Math.floor(Math.random() * templates.length)];
        }

        // Get current focus name
        let currentFocusName = 'somewhere else';
        // Try object
        const obj = game.gameObjects[currentFocusId as GameObjectId];
        if (obj) {
            currentFocusName = obj.name;
        } else {
            // Try item
            const item = game.items[currentFocusId as ItemId];
            if (item) {
                currentFocusName = item.name;
            } else {
                // Try NPC
                const npc = game.npcs?.[currentFocusId as NpcId];
                if (npc) {
                    currentFocusName = npc.name;
                }
            }
        }

        const templates = [
            `I can't ${action} ${targetName} because you're currently at ${currentFocusName}, Burt. You'll need to move to ${targetName} first.`,
            `You're at ${currentFocusName} right now, Burt. To ${action} ${targetName}, you'll need to go over there first.`,
            `That won't work from ${currentFocusName}, Burt. Try moving to ${targetName} first.`,
            `You're too far from ${targetName} - you're currently at ${currentFocusName}. Move closer first.`,
            `I can't reach ${targetName} from ${currentFocusName}, Burt. You'll need to get into the vicinity of ${targetName} first.`,
            `You're standing at ${currentFocusName} right now. To ${action} ${targetName}, you need to move there first.`
        ];
        return templates[Math.floor(Math.random() * templates.length)];
    }
}

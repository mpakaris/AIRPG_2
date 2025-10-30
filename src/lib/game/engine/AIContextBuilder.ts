/**
 * AIContextBuilder - Filtered State for LLM
 *
 * This service provides a filtered, authoritative snapshot of game state
 * for the AI to read. The AI NEVER writes to state, only reads this context.
 *
 * Design principles:
 * 1. Only expose visible entities
 * 2. Only expose actionable information (capabilities)
 * 3. No hidden state or spoilers
 * 4. Structured format for consistent parsing
 * 5. Include canonical verb list for guidance
 */

import type { Game, PlayerState, Capabilities } from '../types';
import { VisibilityResolver } from './VisibilityResolver';
import { Validator } from './Validator';
import { GameStateManager } from './GameStateManager';
import { AVAILABLE_COMMANDS } from '../commands';

export type AIContext = {
  chapter: {
    id: string;
    title: string;
    goal: string;
    objectives?: { label: string; completed: boolean }[];
  };
  location: {
    id: string;
    name: string;
    description: string;
  };
  visibleEntities: {
    objects: AIEntity[];
    items: AIEntity[];
    npcs: AIEntity[];
    portals: AIEntity[];
  };
  inventory: AIEntity[];
  availableCommands: string[];
  recentFlags?: string[]; // Recently set flags (for context)
};

export type AIEntity = {
  id: string;
  name: string;
  description?: string;
  capabilities: string[]; // Human-readable: ["can be opened", "can be unlocked"]
  currentState?: string[]; // ["open", "locked", "broken"]
  affordances?: string[]; // What the player CAN do right now: ["open", "examine"]
};

export class AIContextBuilder {
  /**
   * Build complete AI context from current game state
   * This is what gets sent to the LLM
   */
  static buildContext(state: PlayerState, game: Game): AIContext {
    const currentChapter = game.chapters[state.currentChapterId];
    const currentLocation = game.locations[state.currentLocationId];
    const visibleEntities = VisibilityResolver.getVisibleEntities(state, game);

    return {
      chapter: {
        id: state.currentChapterId,
        title: currentChapter?.title || 'Unknown Chapter',
        goal: currentChapter?.goal || '',
        objectives: currentChapter?.objectives?.map(obj => ({
          label: obj.label,
          completed: GameStateManager.hasFlag(state, obj.flag),
        })),
      },
      location: {
        id: state.currentLocationId,
        name: currentLocation?.name || 'Unknown Location',
        description: currentLocation?.sceneDescription || '',
      },
      visibleEntities: {
        objects: visibleEntities.objects.map(id =>
          AIContextBuilder.buildEntityContext(id, state, game, 'object')
        ),
        items: visibleEntities.items
          .filter(id => !state.inventory.includes(id as any)) // Exclude inventory items
          .map(id => AIContextBuilder.buildEntityContext(id, state, game, 'item')),
        npcs: visibleEntities.npcs.map(id =>
          AIContextBuilder.buildEntityContext(id, state, game, 'npc')
        ),
        portals: visibleEntities.portals.map(id =>
          AIContextBuilder.buildEntityContext(id, state, game, 'portal')
        ),
      },
      inventory: state.inventory.map(id =>
        AIContextBuilder.buildEntityContext(id, state, game, 'item')
      ),
      availableCommands: [...AVAILABLE_COMMANDS],
      recentFlags: AIContextBuilder.getRecentFlags(state, 5),
    };
  }

  /**
   * Build context for a single entity
   */
  static buildEntityContext(
    entityId: string,
    state: PlayerState,
    game: Game,
    type: 'object' | 'item' | 'npc' | 'portal'
  ): AIEntity {
    let entity: any;
    let capabilities: Capabilities | undefined;

    switch (type) {
      case 'object':
        entity = game.gameObjects[entityId as any];
        capabilities = entity?.capabilities;
        break;
      case 'item':
        entity = game.items[entityId as any];
        capabilities = entity?.capabilities;
        break;
      case 'npc':
        entity = game.npcs[entityId as any];
        capabilities = undefined; // NPCs don't have standard capabilities
        break;
      case 'portal':
        entity = game.portals[entityId as any];
        capabilities = entity?.capabilities;
        break;
    }

    if (!entity) {
      return {
        id: entityId,
        name: 'Unknown',
        capabilities: [],
        currentState: [],
        affordances: [],
      };
    }

    const entityState = GameStateManager.getEntityState(state, entityId);

    return {
      id: entityId,
      name: entity.name,
      description: AIContextBuilder.getDescription(entity, entityState),
      capabilities: AIContextBuilder.formatCapabilities(capabilities, type),
      currentState: AIContextBuilder.formatState(entityState),
      affordances: Validator.getAffordances(capabilities, entityState),
    };
  }

  /**
   * Get appropriate description based on current state
   */
  static getDescription(entity: any, entityState: any): string | undefined {
    // Check for stateMap description override
    if (entity.stateMap && entityState.currentStateId) {
      const stateOverride = entity.stateMap[entityState.currentStateId];
      if (stateOverride?.description) {
        return stateOverride.description;
      }
    }

    return entity.description || entity.sceneDescription;
  }

  /**
   * Format capabilities as human-readable strings
   */
  static formatCapabilities(capabilities: Capabilities | undefined, type: string): string[] {
    if (!capabilities) {
      if (type === 'npc') {
        return ['can talk to'];
      }
      return [];
    }

    const formatted: string[] = [];

    if (capabilities.openable) formatted.push('can be opened/closed');
    if (capabilities.lockable) formatted.push('can be locked/unlocked');
    if (capabilities.breakable) formatted.push('can be broken');
    if (capabilities.container) formatted.push('is a container');
    if (capabilities.movable) formatted.push('can be moved');
    if (capabilities.searchable) formatted.push('can be searched');
    if (capabilities.inputtable) formatted.push('accepts code/phrase input');
    if (capabilities.powerable) formatted.push('can be powered on/off');
    if (capabilities.readable) formatted.push('can be read');
    if (capabilities.usable) formatted.push('can be used');
    if (capabilities.combinable) formatted.push('can be combined');
    if (capabilities.takable) formatted.push('can be taken');
    if (capabilities.passage) formatted.push('is a passage');

    return formatted;
  }

  /**
   * Format current state as human-readable strings
   */
  static formatState(entityState: any): string[] {
    const state: string[] = [];

    if (entityState.isOpen === true) state.push('open');
    if (entityState.isOpen === false) state.push('closed');
    if (entityState.isLocked === true) state.push('locked');
    if (entityState.isLocked === false) state.push('unlocked');
    if (entityState.isBroken === true) state.push('broken');
    if (entityState.isMoved === true) state.push('moved');
    if (entityState.isPoweredOn === true) state.push('powered on');
    if (entityState.isPoweredOn === false) state.push('powered off');
    if (entityState.taken === true) state.push('in inventory');

    if (entityState.currentStateId && entityState.currentStateId !== 'default') {
      state.push(`state: ${entityState.currentStateId}`);
    }

    return state;
  }

  /**
   * Get recently set flags (for narrative context)
   */
  static getRecentFlags(state: PlayerState, limit: number = 5): string[] {
    // Since flags are now Record<string, boolean>, get all true flags
    const trueFlags = Object.entries(state.flags)
      .filter(([_, value]) => value === true)
      .map(([flag, _]) => flag);

    // Return last N flags (in a real implementation, we'd track timestamps)
    return trueFlags.slice(-limit);
  }

  /**
   * Format context as a prompt string for the AI
   */
  static formatAsPrompt(context: AIContext): string {
    const lines: string[] = [];

    lines.push(`## Current Situation`);
    lines.push(`**Chapter**: ${context.chapter.title}`);
    lines.push(`**Goal**: ${context.chapter.goal}`);

    if (context.chapter.objectives && context.chapter.objectives.length > 0) {
      lines.push(`**Objectives**:`);
      context.chapter.objectives.forEach(obj => {
        const status = obj.completed ? '✓' : '○';
        lines.push(`  ${status} ${obj.label}`);
      });
    }

    lines.push(``);
    lines.push(`## Current Location: ${context.location.name}`);
    lines.push(context.location.description);

    if (context.visibleEntities.objects.length > 0) {
      lines.push(``);
      lines.push(`**Visible Objects**:`);
      context.visibleEntities.objects.forEach(obj => {
        lines.push(`- **${obj.name}**: ${obj.description || ''}`);
        if (obj.currentState && obj.currentState.length > 0) {
          lines.push(`  State: ${obj.currentState.join(', ')}`);
        }
        if (obj.affordances && obj.affordances.length > 0) {
          lines.push(`  Can: ${obj.affordances.join(', ')}`);
        }
      });
    }

    if (context.visibleEntities.items.length > 0) {
      lines.push(``);
      lines.push(`**Visible Items**:`);
      context.visibleEntities.items.forEach(item => {
        lines.push(`- **${item.name}**: ${item.description || ''}`);
      });
    }

    if (context.visibleEntities.npcs.length > 0) {
      lines.push(``);
      lines.push(`**People Here**:`);
      context.visibleEntities.npcs.forEach(npc => {
        lines.push(`- **${npc.name}**: ${npc.description || ''}`);
      });
    }

    if (context.inventory.length > 0) {
      lines.push(``);
      lines.push(`**Your Inventory**:`);
      context.inventory.forEach(item => {
        lines.push(`- ${item.name}`);
      });
    }

    lines.push(``);
    lines.push(`## Available Commands`);
    lines.push(context.availableCommands.join(', '));

    return lines.join('\n');
  }
}

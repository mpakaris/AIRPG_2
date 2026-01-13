/**
 * handle-look - NEW ARCHITECTURE
 *
 * Handles looking around the current location.
 * CLEARS FOCUS: Returns player to room-level view.
 * Returns Effect[] instead of mutating state directly.
 */

'use server';

import type { Game, PlayerState, Effect } from "@/lib/game/types";
import { VisibilityResolver } from "@/lib/game/engine";

export async function handleLook(state: PlayerState, game: Game): Promise<Effect[]> {
  const location = game.locations[state.currentLocationId];

  // Use location-specific prefix or generic noir flavor
  const prefix = location.lookAroundPrefix || "You look around carefully.";
  const description = location.sceneDescription;

  let fullDescription = `${prefix} ${description}`.trim();

  // Show visible objects/zones in CURRENT location (not other locations)
  const visibleEntities = VisibilityResolver.getVisibleEntities(state, game);

  if (visibleEntities.objects.length > 0) {
    fullDescription += '\n\n**Objects here:**';
    visibleEntities.objects.forEach(objectId => {
      const obj = game.gameObjects[objectId as any];
      if (obj && obj.locationId === state.currentLocationId) {
        fullDescription += `\n🔍 ${obj.name}`;
      }
    });
  }

  // Define street-level locations (matching handle-go.ts)
  const streetLevelLocations = new Set([
    'loc_elm_street',
    'loc_bus_stop',
    'loc_florist_exterior',
    'loc_butcher_exterior',
    'loc_kiosk',
    'loc_cctv_exterior',
    'loc_construction_exterior',
    'loc_electrician_truck',
    'loc_alley'
  ]);

  const currentIsStreet = streetLevelLocations.has(state.currentLocationId);

  // Show available portals (other locations player can go to)
  const availablePortals = Object.values(game.portals)
    .filter(portal => portal.fromLocationId === state.currentLocationId)
    .filter(portal => !portal.hideInLookAround)  // Exclude hidden portals
    .filter(portal => {
      // Check if portal is revealed
      const portalState = state.entityStates?.[portal.id as any];
      if (portal.isRevealed === false && portalState?.isVisible !== true) {
        return false; // Portal not yet revealed
      }
      return true;
    })
    .filter(portal => {
      // Check if portal requirements are met
      if (!portal.requirements?.conditions || portal.requirements.conditions.length === 0) {
        return true; // Unlocked portal
      }
      // Check conditions (simplified - would use Validator in real implementation)
      return portal.requirements.conditions.every(condition => {
        if (condition.type === 'FLAG') {
          return state.flags[condition.flag] === true;
        }
        return true;
      });
    });

  // Collect available locations
  const availableLocationIds = new Set<string>();

  // Add direct portal destinations
  availablePortals.forEach(portal => {
    availableLocationIds.add(portal.toLocationId);
  });

  // If at street-level, add ALL other street-level locations (for auto-routing)
  if (currentIsStreet) {
    streetLevelLocations.forEach(locId => {
      if (locId !== state.currentLocationId) {
        availableLocationIds.add(locId);
      }
    });
  }

  // Show available locations
  if (availableLocationIds.size > 0) {
    fullDescription += '\n\n**Available locations:**';

    // Sort locations: direct portals first, then street-level locations alphabetically
    const sortedLocations = Array.from(availableLocationIds).sort((a, b) => {
      const aIsDirect = availablePortals.some(p => p.toLocationId === a);
      const bIsDirect = availablePortals.some(p => p.toLocationId === b);

      if (aIsDirect && !bIsDirect) return -1;
      if (!aIsDirect && bIsDirect) return 1;

      const aLoc = game.locations[a];
      const bLoc = game.locations[b];
      return aLoc.name.localeCompare(bLoc.name);
    });

    sortedLocations.forEach(locId => {
      const targetLocation = game.locations[locId];
      if (targetLocation) {
        fullDescription += `\n🚪 ${targetLocation.name}`;
      }
    });
  }

  // Show NPCs if present
  if (visibleEntities.npcs.length > 0) {
    fullDescription += '\n\n**People here:**';
    visibleEntities.npcs.forEach(npcId => {
      const npc = game.npcs[npcId as any];
      if (npc) {
        fullDescription += `\n👤 ${npc.name}`;
      }
    });
  }

  // Build the message effect with location wide shot image if available
  const messageEffect: Effect = {
    type: 'SHOW_MESSAGE',
    speaker: 'narrator',
    content: fullDescription.trim()
  };

  // Add location image for wide shot view (cartridge-driven)
  if (location.sceneImage) {
    messageEffect.messageType = 'image';
    messageEffect.imageUrl = location.sceneImage.url;
    messageEffect.imageDescription = location.sceneImage.description;
    messageEffect.imageHint = location.sceneImage.hint;
  }

  return [
    // Clear focus first - returns to room-level view
    {
      type: 'CLEAR_FOCUS'
    },
    messageEffect
  ];
}

/**
 * handle-go - NEW ZONE ARCHITECTURE
 *
 * Handles zone-based navigation within locations and movement between locations.
 * Uses ZoneManager for access validation and spatial hierarchy enforcement.
 */

'use server';

import type { Game, Location, PlayerState, ChapterId, Flag, Effect, GameObjectId, ItemId, ZoneId } from "@/lib/game/types";
import { ZoneManager } from "@/lib/game/engine";
import { findBestMatch } from "@/lib/game/utils/name-matching";
import { normalizeName } from "@/lib/utils";
import { MessageExpander } from "@/lib/game/utils/message-expansion";
import { generateCantAccessMessage } from "@/ai";

const chapterCompletionFlag = (chapterId: ChapterId) => `chapter_${chapterId}_complete` as Flag;

/**
 * Helper to create a location message effect with optional scene image
 */
function createLocationMessage(location: Location): Effect {
  const effect: Effect = {
    type: 'SHOW_MESSAGE',
    speaker: 'narrator',
    content: location.sceneDescription
  };

  if (location.sceneImage) {
    effect.messageType = 'image';
    effect.imageUrl = location.sceneImage.url;
    effect.imageDescription = location.sceneImage.description;
    effect.imageHint = location.sceneImage.hint;
  }

  return effect;
}

function checkChapterCompletion(state: PlayerState, game: Game): boolean {
  const chapter = game.chapters[game.startChapterId];
  const isAlreadyComplete = state.flags[chapterCompletionFlag(game.startChapterId)];

  if (isAlreadyComplete || !chapter.objectives || chapter.objectives.length === 0) {
    return isAlreadyComplete;
  }

  const allObjectivesMet = chapter.objectives.every(obj => state.flags[obj.flag]);
  return allObjectivesMet;
}

export async function handleGo(state: PlayerState, targetName: string, game: Game): Promise<Effect[]> {
  const chapter = game.chapters[game.startChapterId];
  const currentLocation = game.locations[state.currentLocationId];
  targetName = targetName.toLowerCase();
  const narratorName = game.narratorName || "Narrator";

  // ===========================================================================
  // SPECIAL CASE: Chapter Progression
  // ===========================================================================
  if (targetName === 'next_chapter') {
    const isComplete = checkChapterCompletion(state, game);

    if (isComplete) {
      const nextChapterId = chapter.nextChapter?.id;
      if (nextChapterId && game.chapters[nextChapterId]) {
        const nextChapter = game.chapters[nextChapterId];
        const newLocation = game.locations[nextChapter.startLocationId];

        return [
          { type: 'MOVE_TO_LOCATION', toLocationId: nextChapter.startLocationId },
          { type: 'END_CONVERSATION' },
          { type: 'END_INTERACTION' },
          { type: 'SHOW_MESSAGE', speaker: 'system', content: game.systemMessages.chapterTransition(nextChapter.title) },
          createLocationMessage(newLocation)
        ];
      } else {
        const message = await MessageExpander.static(game.systemMessages.noNextChapter);
        return [{ type: 'SHOW_MESSAGE', speaker: 'system', content: message }];
      }
    } else {
      const message = await MessageExpander.static(game.systemMessages.chapterIncomplete(chapter.goal, currentLocation.name));
      return [{ type: 'SHOW_MESSAGE', speaker: 'narrator', content: message }];
    }
  }

  // ===========================================================================
  // CASE 1: Navigate to Another Location
  // ===========================================================================
  const cleanedTargetName = targetName.replace(/["']/g, '');
  let targetLocation: Location | undefined;
  targetLocation = Object.values(game.locations).find(loc => loc.name.toLowerCase() === cleanedTargetName);

  if (targetLocation) {
    return [
      { type: 'MOVE_TO_LOCATION', toLocationId: targetLocation.locationId },
      { type: 'END_CONVERSATION' },
      { type: 'END_INTERACTION' },
      { type: 'SHOW_MESSAGE', speaker: 'system', content: game.systemMessages.locationTransition(targetLocation.name) },
      createLocationMessage(targetLocation)
    ];
  }

  // ===========================================================================
  // CASE 2: Navigate to Object/Zone Within Current Location
  // ===========================================================================
  console.log('[DEBUG GOTO] Searching for object/zone:', cleanedTargetName);
  const normalizedTargetName = normalizeName(cleanedTargetName);
  const bestMatch = findBestMatch(normalizedTargetName, state, game, {
    searchInventory: false,
    searchVisibleItems: false,
    searchObjects: true,
    requireFocus: false
  });

  if (!bestMatch || bestMatch.category !== 'object') {
    const message = await MessageExpander.static(game.systemMessages.cannotGoThere);
    return [{ type: 'SHOW_MESSAGE', speaker: 'system', content: message }];
  }

  const targetObject = game.gameObjects[bestMatch.id as GameObjectId];
  if (!targetObject) {
    const message = await MessageExpander.static(game.systemMessages.cannotGoThere);
    return [{ type: 'SHOW_MESSAGE', speaker: 'system', content: message }];
  }

  // Get target's zone first
  const targetZone = ZoneManager.getEntityZone(targetObject.id, 'object', game);

  // Check if object is a child BUT has no zone - these are not navigable
  // (e.g., suitcase inside dumpster - has parentId but no zone)
  // Objects WITH zones are navigable even if they're children (e.g., dumpster in alley)
  if (targetObject.parentId && (!targetZone || targetZone === 'personal')) {
    let errorMessage: string;
    try {
      const aiResult = await generateCantAccessMessage({
        targetName: targetObject.name,
        action: 'go to',
        locationName: currentLocation.name,
        gameSetting: game.setting || 'Modern-day detective game'
      });
      errorMessage = aiResult.output.message;
    } catch (error) {
      console.error("AI generation failed for child object navigation:", error);
      errorMessage = `You can't navigate to the ${targetObject.name}. Try examining or interacting with it instead.`;
    }
    return [{ type: 'SHOW_MESSAGE', speaker: 'narrator', content: errorMessage }];
  }

  // Check if no zone system
  if (!targetZone || targetZone === 'personal') {
    // No zone system or personal equipment - generate AI narrative
    let errorMessage: string;
    try {
      const aiResult = await generateCantAccessMessage({
        targetName: targetObject.name,
        action: 'go to',
        locationName: currentLocation.name,
        gameSetting: game.setting || 'Modern-day detective game'
      });
      errorMessage = aiResult.output.message;
    } catch (error) {
      console.error("AI generation failed for no-zone object:", error);
      errorMessage = `You can't navigate to the ${targetObject.name} right now.`;
    }
    return [{ type: 'SHOW_MESSAGE', speaker: 'narrator', content: errorMessage }];
  }

  // Check if player can navigate to this zone
  const canNavigate = ZoneManager.canNavigateToZone(
    targetZone as ZoneId,
    state.currentZoneId || null,
    currentLocation
  );

  if (!canNavigate.allowed) {
    // Generate narrative failure message for zone navigation
    let errorMessage: string;
    try {
      const aiResult = await generateCantAccessMessage({
        targetName: targetObject.name,
        action: 'go to',
        locationName: currentLocation.name,
        gameSetting: game.setting || 'Modern-day detective game'
      });
      errorMessage = aiResult.output.message;
    } catch (error) {
      console.error("AI generation failed for navigation failure:", error);
      errorMessage = 'You cannot go there right now.';
    }
    return [{ type: 'SHOW_MESSAGE', speaker: 'narrator', content: errorMessage }];
  }

  // Find zone definition
  const zone = currentLocation.zones?.find(z => z.id === targetZone);
  if (!zone) {
    const message = await MessageExpander.static(`You can't go to the ${targetObject.name}`);
    return [{ type: 'SHOW_MESSAGE', speaker: 'system', content: message }];
  }

  // Check if zone requires special action (e.g., 'climb')
  if (zone.requiresAction) {
    // Simple, non-instructive message about the physical obstacle
    // Focus on the barrier/challenge, not the solution
    let errorMessage: string;

    if (zone.requiresAction === 'climb') {
      errorMessage = `You peer at the ${targetObject.name} from ground level. You're not going to reach what's inside from where you're standing. You'd need to get up there somehow.`;
    } else {
      errorMessage = `You can't just walk into the ${targetObject.name}. There's something you'll need to do first.`;
    }

    return [{ type: 'SHOW_MESSAGE', speaker: 'narrator', content: errorMessage }];
  }

  // Navigate to zone
  const effects: Effect[] = [];

  // Use zone's transition narration or object's transition narration
  const transitionMessage = zone.transitionNarration || targetObject.transitionNarration || `You move to the ${targetObject.name}`;

  effects.push({
    type: 'SET_ZONE',
    zoneId: targetZone as ZoneId,
    transitionMessage: transitionMessage
  });

  // Optionally also update focus to the target object
  effects.push({
    type: 'SET_FOCUS',
    focusId: targetObject.id,
    focusType: 'object'
  });

  return effects;
}

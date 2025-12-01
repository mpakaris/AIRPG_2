/**
 * chapter-completion-checker.ts
 *
 * Checks if chapter is complete based on happy path progress
 * and triggers completion effects (video, transition message, etc.)
 */

import type { Chapter, PlayerState, Game, Effect } from "@/lib/game/types";
import { checkChapterCompletion } from "./happy-path-tracker";

/**
 * Checks if chapter is complete and returns completion effects if so
 *
 * This should be called after every command to automatically detect
 * when the player has finished all required steps.
 *
 * @returns Array of effects to show completion video/message, or empty array
 */
export function checkAndTriggerChapterCompletion(
  state: PlayerState,
  chapter: Chapter,
  game: Game
): Effect[] {
  // Skip if no happy path defined
  if (!chapter.happyPath || chapter.happyPath.length === 0) {
    return [];
  }

  // Check if chapter is complete
  const isComplete = checkChapterCompletion(chapter, state, game);

  if (!isComplete) {
    return [];
  }

  // Check if we've already shown completion (to avoid showing it multiple times)
  const completionFlag = `chapter_${chapter.id}_completed` as any;
  if (state.flags[completionFlag]) {
    return []; // Already shown completion
  }

  const effects: Effect[] = [];

  // Mark chapter as completed
  effects.push({
    type: 'SET_FLAG',
    flag: completionFlag,
    value: true
  });

  // Show completion message
  const completionMessage = chapter.postChapterMessage ||
    `🎉 Congratulations! You've completed "${chapter.title}"!`;

  effects.push({
    type: 'SHOW_MESSAGE',
    speaker: 'narrator',
    content: completionMessage
  });

  // Show completion video if available
  if (chapter.completionVideo) {
    effects.push({
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: `Watch the completion video:`,
      messageType: 'video'
      // TODO: Add video URL support to SHOW_MESSAGE effect
    });
  }

  // Show transition to next chapter if available
  if (chapter.nextChapter) {
    effects.push({
      type: 'SHOW_MESSAGE',
      speaker: 'narrator',
      content: `\n\nReady for the next chapter? Type "${chapter.nextChapter.transitionCommand}" to continue to "${chapter.nextChapter.title}".`
    });
  }

  return effects;
}

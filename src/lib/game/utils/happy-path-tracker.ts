/**
 * happy-path-tracker.ts
 *
 * Utilities for tracking player progress through a chapter's happy path.
 * Used for AI-generated contextual hints and chapter completion detection.
 */

import type { Chapter, Flag, HappyPathStep, PlayerState, Game } from "@/lib/game/types";
import { GameStateManager } from "@/lib/game/engine/GameStateManager";
import { Validator } from "@/lib/game/engine/Validator";

export type HappyPathProgress = {
  currentStep: HappyPathStep | null;
  currentStepIndex: number;
  completedSteps: HappyPathStep[];
  remainingSteps: HappyPathStep[];
  completionPercentage: number;
  isChapterComplete: boolean;
  nextStepHint: string | null;
};

/**
 * Analyzes player's progress through the chapter's happy path
 */
export function analyzeHappyPathProgress(
  state: PlayerState,
  chapter: Chapter,
  game: Game
): HappyPathProgress {
  const happyPath = chapter.happyPath || [];

  if (happyPath.length === 0) {
    return {
      currentStep: null,
      currentStepIndex: -1,
      completedSteps: [],
      remainingSteps: [],
      completionPercentage: 0,
      isChapterComplete: false,
      nextStepHint: null,
    };
  }

  // Sort steps by order
  const sortedSteps = [...happyPath].sort((a, b) => a.order - b.order);

  const completedSteps: HappyPathStep[] = [];
  const remainingSteps: HappyPathStep[] = [];
  let currentStep: HappyPathStep | null = null;
  let currentStepIndex = -1;

  // Determine which steps are completed
  for (let i = 0; i < sortedSteps.length; i++) {
    const step = sortedSteps[i];
    const isStepComplete = isStepCompleted(step, state);

    if (isStepComplete) {
      completedSteps.push(step);
    } else {
      remainingSteps.push(step);

      // First incomplete step is the current step
      if (currentStep === null) {
        currentStep = step;
        currentStepIndex = i;
      }
    }
  }

  const completionPercentage = happyPath.length > 0
    ? (completedSteps.length / happyPath.length) * 100
    : 0;

  // Check if chapter is complete
  const isChapterComplete = checkChapterCompletion(chapter, state, game);

  // Get hint for current step
  const nextStepHint = currentStep
    ? getBestHintForStep(currentStep, state, game)
    : null;

  return {
    currentStep,
    currentStepIndex,
    completedSteps,
    remainingSteps,
    completionPercentage,
    isChapterComplete,
    nextStepHint,
  };
}

/**
 * Checks if a specific step is completed
 */
function isStepCompleted(step: HappyPathStep, state: PlayerState): boolean {
  // Step is complete if ANY of its completion flags are true
  return step.completionFlags.some(flag =>
    GameStateManager.hasFlag(state, flag)
  );
}

/**
 * Gets the most appropriate hint for a step based on player's current state
 */
function getBestHintForStep(
  step: HappyPathStep,
  state: PlayerState,
  game: Game
): string {
  // Check conditional hints first
  if (step.conditionalHints) {
    for (const conditionalHint of step.conditionalHints) {
      const conditionsMet = Validator.evaluateConditions(
        conditionalHint.conditions,
        state,
        game
      );

      if (conditionsMet) {
        return conditionalHint.hint;
      }
    }
  }

  // Return detailed hint if available, otherwise base hint
  return step.detailedHint || step.baseHint;
}

/**
 * Checks if the chapter is complete based on happy path and completion requirements
 */
export function checkChapterCompletion(
  chapter: Chapter,
  state: PlayerState,
  game: Game
): boolean {
  const happyPath = chapter.happyPath || [];

  if (happyPath.length === 0) {
    return false;
  }

  const requirements = chapter.completionRequirements || {};

  // Count completed steps
  const completedStepCount = happyPath.filter(step =>
    isStepCompleted(step, state)
  ).length;

  // Check minimum steps requirement
  if (requirements.minimumStepsRequired !== undefined) {
    if (completedStepCount < requirements.minimumStepsRequired) {
      return false;
    }
  }
  // Default: require all steps
  else if (requirements.requireAllSteps !== false) {
    if (completedStepCount < happyPath.length) {
      return false;
    }
  }

  // Check additional flags if specified
  if (requirements.additionalFlags) {
    const allAdditionalFlagsSet = requirements.additionalFlags.every(flag =>
      GameStateManager.hasFlag(state, flag)
    );

    if (!allAdditionalFlagsSet) {
      return false;
    }
  }

  return true;
}

/**
 * Gets a formatted progress summary for debugging/display
 */
export function getProgressSummary(progress: HappyPathProgress): string {
  const lines: string[] = [];

  lines.push(`📊 Chapter Progress: ${progress.completionPercentage.toFixed(0)}%`);
  lines.push(`✅ Completed: ${progress.completedSteps.length}`);
  lines.push(`⏳ Remaining: ${progress.remainingSteps.length}`);

  if (progress.currentStep) {
    lines.push(`\n🎯 Current Step: ${progress.currentStep.description}`);
  }

  if (progress.isChapterComplete) {
    lines.push(`\n🎉 Chapter Complete!`);
  }

  return lines.join('\n');
}

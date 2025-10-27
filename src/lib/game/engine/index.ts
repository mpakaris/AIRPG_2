/**
 * Game Engine - Core Services
 *
 * This module exports all the engine services that implement the new architecture:
 * 1. GameStateManager - Central effect reducer
 * 2. Validator - Capability and condition checking
 * 3. VisibilityResolver - Parent-child and visibility logic
 * 4. AIContextBuilder - Filtered state for LLM
 */

export { GameStateManager } from './GameStateManager';
export { Validator } from './Validator';
export type { ValidationResult } from './Validator';
export { VisibilityResolver } from './VisibilityResolver';
export type { VisibilityContext } from './VisibilityResolver';
export { AIContextBuilder } from './AIContextBuilder';
export type { AIContext, AIEntity } from './AIContextBuilder';

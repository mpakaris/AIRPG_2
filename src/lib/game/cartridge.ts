/**
 * Cartridge Entry Point (Backward Compatibility)
 *
 * This file maintains backward compatibility with existing imports.
 * It re-exports the current active chapter (chapter-0).
 *
 * For new code, prefer importing directly from cartridges/index.ts
 */

export { game } from './cartridges/chapter-0';

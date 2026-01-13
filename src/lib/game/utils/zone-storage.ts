/**
 * Zone Storage System
 *
 * Maps locations to their designated storage containers for dropped items.
 * Each location has a "ground" container where dropped items are collected.
 */

import type { LocationId, GameObjectId } from '../types';

/**
 * Map of location IDs to their zone storage container IDs
 */
export const ZONE_STORAGE_MAP: Record<string, GameObjectId> = {
  // Chapter 1 locations
  'loc_elm_street': 'obj_street_storage' as GameObjectId,
  'loc_florist_exterior': 'obj_florist_exterior_storage' as GameObjectId,
  'loc_florist_interior': 'obj_florist_interior_storage' as GameObjectId,
  'loc_butcher_exterior': 'obj_butcher_exterior_storage' as GameObjectId,
  'loc_butcher_interior': 'obj_butcher_interior_storage' as GameObjectId,
  'loc_bus_stop': 'obj_bus_stop_storage' as GameObjectId,
  'loc_alley': 'obj_alley_storage' as GameObjectId,
  // Add more locations as needed
};

/**
 * Get the storage container ID for the current location
 */
export function getZoneStorageId(locationId: LocationId): GameObjectId | null {
  return ZONE_STORAGE_MAP[locationId] || null;
}

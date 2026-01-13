/**
 * Attribute Calculator - Item Combination System
 *
 * Handles combining item attributes and checking container requirements
 */

import type { Item, ItemAttributes, ContainerRequirement, ItemId, GameObject } from '../types';

/**
 * Combine attributes from multiple items
 * Additive for numeric values, OR for booleans
 */
export function combineAttributes(items: Item[]): ItemAttributes {
  const combined: ItemAttributes = {};

  for (const item of items) {
    if (!item.attributes) continue;

    // Add numeric attributes
    const numericAttrs = [
      'force', 'prying', 'cutting', 'drilling', 'picking',
      'electricity', 'corrosion', 'explosion', 'heat',
      'waterDamage', 'cold', 'light', 'adhesive', 'unlocking'
    ] as const;

    for (const attr of numericAttrs) {
      if (item.attributes[attr] !== undefined) {
        combined[attr] = (combined[attr] || 0) + item.attributes[attr]!;
      }
    }

    // OR boolean attributes
    if (item.attributes.conductor) combined.conductor = true;
    if (item.attributes.consumable) combined.consumable = true;
    if (item.attributes.reusable) combined.reusable = true;
    if (item.attributes.degradable) combined.degradable = true;
  }

  return combined;
}

/**
 * Check if provided attributes meet container requirements
 * Returns { success: boolean, message: string, matchedOption?: number }
 */
export function checkRequirements(
  provided: ItemAttributes,
  requirements: ContainerRequirement,
  containerName: string
): { success: boolean; message: string; matchedOption?: number } {

  // Try each option (OR logic)
  for (let i = 0; i < requirements.options.length; i++) {
    const option = requirements.options[i];
    const result = checkSingleOption(provided, option.attributes, option.minTotal);

    if (result.success) {
      return {
        success: true,
        message: result.message || `Success! Combined attributes meet requirements.`,
        matchedOption: i
      };
    }
  }

  // No options matched - generate helpful failure message
  const failureMsg = generateFailureMessage(provided, requirements, containerName);
  return {
    success: false,
    message: failureMsg
  };
}

/**
 * Check if provided attributes satisfy a single option (AND logic)
 */
function checkSingleOption(
  provided: ItemAttributes,
  required: Partial<ItemAttributes>,
  minTotal?: number
): { success: boolean; message?: string } {

  // Check each required attribute
  for (const [key, value] of Object.entries(required)) {
    const providedValue = provided[key as keyof ItemAttributes];

    if (typeof value === 'number') {
      // Numeric comparison
      if (typeof providedValue !== 'number' || providedValue < value) {
        return {
          success: false,
          message: `Insufficient ${key}. Need ${value}, have ${providedValue || 0}`
        };
      }
    } else if (typeof value === 'boolean') {
      // Boolean check
      if (!providedValue) {
        return {
          success: false,
          message: `Missing required property: ${key}`
        };
      }
    }
  }

  // Check minTotal if specified
  if (minTotal) {
    const total = calculateTotal(provided);
    if (total < minTotal) {
      return {
        success: false,
        message: `Total strength ${total} is below minimum ${minTotal}`
      };
    }
  }

  return { success: true };
}

/**
 * Calculate total numeric value of all attributes
 */
function calculateTotal(attrs: ItemAttributes): number {
  let total = 0;
  const numericAttrs = [
    'force', 'prying', 'cutting', 'drilling', 'picking',
    'electricity', 'corrosion', 'explosion', 'heat',
    'waterDamage', 'cold', 'light', 'adhesive', 'unlocking'
  ] as const;

  for (const attr of numericAttrs) {
    if (attrs[attr]) total += attrs[attr]!;
  }

  return total;
}

/**
 * Generate helpful failure message
 */
function generateFailureMessage(
  provided: ItemAttributes,
  requirements: ContainerRequirement,
  containerName: string
): string {
  const option = requirements.options[0]; // Show first option as hint
  const required = option.attributes;

  // Find the gaps
  const gaps: string[] = [];

  for (const [key, value] of Object.entries(required)) {
    const providedValue = provided[key as keyof ItemAttributes];

    if (typeof value === 'number') {
      const current = (typeof providedValue === 'number' ? providedValue : 0);
      const needed = value;

      if (current < needed) {
        const gap = needed - current;
        gaps.push(`${key}: need ${needed}, have ${current} (gap: ${gap})`);
      }
    } else if (typeof value === 'boolean' && !providedValue) {
      gaps.push(`${key}: required but not provided`);
    }
  }

  if (gaps.length === 0) {
    return `The ${containerName} won't open. Try a different combination or approach.`;
  }

  return `Not quite enough. ${gaps.join(' | ')}. Try combining with other items for more strength.`;
}

/**
 * Get items from inventory by IDs
 */
export function getItemsFromInventory(
  itemIds: ItemId[],
  allItems: Record<string, Item>
): Item[] {
  return itemIds
    .map(id => allItems[id])
    .filter(item => item !== undefined);
}

/**
 * Check if container can be opened with given items
 * High-level function for handlers
 */
export function canOpenContainer(
  container: GameObject,
  items: Item[],
  containerName?: string
): { success: boolean; message: string; consumedItems?: ItemId[] } {

  if (!container.requirements) {
    return {
      success: true,
      message: `The ${containerName || container.name} opens.`
    };
  }

  const combined = combineAttributes(items);
  const result = checkRequirements(
    combined,
    container.requirements,
    containerName || container.name
  );

  if (result.success) {
    // Determine which items are consumed
    const consumedItems = items
      .filter(item => item.attributes?.consumable)
      .map(item => item.id);

    return {
      success: true,
      message: result.message,
      consumedItems: consumedItems.length > 0 ? consumedItems : undefined
    };
  }

  return {
    success: false,
    message: result.message
  };
}

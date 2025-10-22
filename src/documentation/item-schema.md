
# Standardized Item Schema Documentation

This document outlines the standard structure for all `Item` definitions within the game cartridge. This schema is designed to work in tandem with the `GameObject` schema, providing a predictable and powerful framework for creating interactive, portable items.

## Root Object

| Property | Type | Description |
| :--- | :--- | :--- |
| `id` | `ItemId` | The unique identifier for the item (e.g., 'item_business_card'). |
| `name` | `string` | The user-facing name of the item (e.g., "Business Card"). |
| `type` | `string` | Always "item" for type discrimination. |
| `description` | `string` | The default description when the item is examined. |
| `alternateDescription`| `string` | (Optional) A description for subsequent examinations. |
| `i18nKey` | `string` | (Optional) The key for localization lookups. |
| `capabilities` | `object` | A set of boolean flags declaring what the item *can* do. |
| `state` | `object` | The item's current, dynamic state. |
| `logic` | `object` | Defines the item's core gameplay purpose and connections. |
| `placement`| `object`| Defines where the item originates in the world. |
| `ui` | `object` | Hints for how the UI should display the item. |
| `media` | `object` | Contains all visual and audio assets for the item. |
| `handlers` | `object` | A collection of event handlers for all player interactions. |
| `stacking` | `object` | Defines if and how the item can be stacked. |
| `limits` | `object` | Defines usage cooldowns or limits. |
| `design` | `object` | Metadata for game designers. |
| `analytics` | `object` | (Engine-filled) Telemetry data. |
| `version` | `object` | Versioning for schema and content. |

---

## Detailed Properties

### `capabilities`
Defines the inherent abilities of an item.

| Property | Type | Description |
| :--- | :--- | :--- |
| `isTakable` | `boolean` | Can the item be picked up from its initial location? |
| `isReadable` | `boolean` | Can the `read` verb be used on this item? |
| `isUsable` | `boolean` | Can this item be used by itself (e.g., `use phone`)? |
| `isCombinable` | `boolean` | Can this item be combined with others? |
| `isConsumable` | `boolean` | Is the item destroyed after use? |
| `isScannable` | `boolean` | Can a 'scan' tool be used on this? |
| `isAnalyzable` | `boolean` | Can an 'analyze' tool be used on this? |
| `isPhotographable` | `boolean` | Can a 'photograph' tool be used on this? |

### `logic`
Defines the item's gameplay purpose and relationships.

| Property | Type | Description |
| :--- | :--- | :--- |
| `revealConditions` | `array` | Conditions (e.g., flags) that must be met for this item to appear. |
| `grantsClues` | `array` | A list of clue or flag IDs that are revealed upon successful use/read. |
| `affectsFlags` | `array` | A list of flags that are set/unset when this item is used. |
| `intendedUseTargets`| `array` | A list of `GameObjectId`s or tags to help the AI route `use X on Y` commands. |
| `blockedByFlags` | `array` | If any of these flags are set, the item cannot be used. |

### `handlers`
This is the core of the item's interactivity, using the unified `{conditions[], success{}, fail{}}` shape.

*   `onTake`: Triggered when the item is first picked up from the world.
*   `onUse`: For using the item by itself (e.g., `use "Phone"`).
*   `onRead`: For reading the item's content.
*   `onScan` / `onAnalyze` / `onPhotograph`: Handlers for special detective tools.
*   `onCombine`: An array defining how this item reacts to being combined with others. Each entry includes the `itemId` of the other item and the `success`/`fail` outcomes.
*   `defaultFailMessage`: A fallback message for any failed interaction that doesn't have a specific `fail` block.

### `media`
A centralized place for all images and sounds related to the item.

| Property | Type | Description |
| :--- | :--- | :--- |
| `image` | `ImageDetails` | The primary image for the item in inventory and examination views. |
| `sounds` | `object` | A map of event names to sound file URLs (`onUse`, `onCombine`). |

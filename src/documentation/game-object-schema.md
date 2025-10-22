
# Standardized GameObject Schema Documentation

This document outlines the standard structure for all `GameObject` definitions within the game cartridge. Adhering to this schema ensures predictability, simplifies engine logic, and accelerates content creation.

## Root Object

| Property | Type | Description |
| :--- | :--- | :--- |
| `id` | `GameObjectId` | The unique identifier for the object (e.g., 'obj_main_safe'). |
| `name` | `string` | The user-facing name of the object (e.g., "Main Safe"). |
| `description` | `string` | The default description of the object when it first appears or is examined. |
| `capabilities` | `object` | A set of boolean flags declaring what the object *can* do. |
| `initialState` | `object` | The starting state of the object when the game loads. |
| `inventory` | `object` | (Optional) Defines the object as a container. |
| `links` | `array` | (Optional) Defines relationships with other objects (e.g., a switch controlling a door). |
| `media` | `object` | Contains all visual and audio assets for the object. |
| `input` | `object` | (Optional) Defines the object as a puzzle that accepts direct user input (e.g., a keypad). |
| `handlers` | `object` | A collection of event handlers for all player interactions. |
| `stateMap` | `object` | (Optional) A map to override descriptions or media based on the object's `currentStateId`. |
| `fallbackMessages`| `object` | A set of default messages for common failed actions. |
| `design` | `object` | Metadata for game designers. |
| `version` | `object` | Versioning for schema and content. |

---

## Detailed Properties

### `capabilities`
Defines the inherent abilities of an object. If a capability is `false`, the engine will not attempt the corresponding action.

| Property | Type | Description |
| :--- | :--- | :--- |
| `openable` | `boolean` | Can this object be opened or closed? |
| `lockable` | `boolean` | Can this object be locked or unlocked? |
| `breakable` | `boolean` | Can this object be broken or destroyed? |
| `movable` | `boolean` | Can this object be pushed, pulled, or moved? |
| `powerable` | `boolean` | Can this object be powered on or off? |
| `container` | `boolean` | Can this object hold other items? |
| `readable` | `boolean` | Can this object be read? |
| `inputtable` | `boolean` | Does this object accept direct input (like a keypad)? |

### `initialState`
The default state of the object. This is copied into the player's dynamic `playerState.objectStates` at the start of the game.

| Property | Type | Description |
| :--- | :--- | :--- |
| `isOpen` | `boolean` | Is the object open by default? |
| `isLocked` | `boolean` | Is the object locked by default? |
| `isBroken` | `boolean` | Is the object broken by default? |
| `isPoweredOn`| `boolean` | Is the object powered on by default? |
| `currentStateId`| `string` | The initial key for the `stateMap`. Usually 'default'. |

### `inventory`
Defines an object as a container for other items. Requires `capabilities.container` to be `true`.

| Property | Type | Description |
| :--- | :--- | :--- |
| `items` | `ItemId[]` | Array of item IDs initially inside the container. |
| `capacity` | `number` | (Optional) Maximum number of items it can hold. `null` for infinite. |
| `allowTags` | `string[]`| (Optional) Only items with these tags can be inserted. |
| `denyTags` | `string[]` | (Optional) Items with these tags cannot be inserted. |

### `media`
A centralized place for all images and sounds related to the object.

| Property | Type | Description |
| :--- | :--- | :--- |
| `images` | `object` | A map of state names to `ImageDetails` objects. Common keys: `default`, `open`, `unlocked`, `broken`. |
| `sounds` | `object` | A map of event names to sound file URLs. Common keys: `onOpen`, `onUnlock`, `onBreak`. |

### `input`
Defines a direct input puzzle. Requires `capabilities.inputtable` to be `true`.

| Property | Type | Description |
| :--- | :--- | :--- |
| `type` | `string` | `code`, `phrase`, `pattern`, `sequence`. |
| `validation`| `string` | The correct answer or a regex pattern for validation. |
| `attempts` | `number` | (Optional) Max number of failed attempts. `null` for infinite. |
| `lockout` | `number` | (Optional) Duration of lockout after max attempts are reached. |

### `handlers`
This is the core of the object's interactivity. Each handler defines what happens when a player performs a verb on the object.

**Handler Structure:**
Most handlers follow this shape:
```json
{
  "conditions": [ { "type": "HAS_FLAG", "targetId": "some_flag" } ],
  "success": { "message": "It works!", "actions": [ { "type": "SET_FLAG", "flag": "success_flag" } ] },
  "fail": { "message": "It fails." }
}
```
*   `conditions`: (Optional) An array of requirements that must be met for the `success` block to run.
*   `success`: The result if conditions are met (or if there are no conditions).
*   `fail`: The result if conditions are not met.

**Available Handlers:**
*   `onExamine`: Player looks at the object.
*   `onSearch`: A more thorough version of `onExamine`.
*   `onOpen` / `onClose`: Player opens/closes the object.
*   `onUnlock`: Player attempts to unlock the object (typically via `onUse` with a key).
*   `onInput`: Player enters a code/phrase into an `inputtable` object.
*   `onUse`: An array defining how the object reacts to another item being used on it (e.g., using a key on a lock).
*   `onInsert` / `onRemove`: Player puts an item into or takes an item from a `container`.
*   `onMove`: Player tries to move the object.
*   `onBreak`: Player tries to break the object.
*   `onActivate` / `onDeactivate`: Player toggles a `powerable` object.
*   `onReset`: Player resets a puzzle to its initial state.

### `fallbackMessages`
Provides default messages for common verbs if a specific handler is not defined or if an action is impossible based on capabilities.

| Property | Type | Description |
| :--- | :--- | :--- |
| `default` | `string` | The ultimate fallback for any unhandled action. |
| `notOpenable` | `string` | Message for trying to `open` an object where `openable: false`. |
| `locked` | `string` | Message for trying to `open` a `lockable` object that is locked. |
| `notMovable` | `string` | Message for trying to `move` an object where `movable: false`. |
| `noEffect` | `string` | Message for `use` when the item has no special interaction. |

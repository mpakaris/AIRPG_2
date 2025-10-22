# Standardized NPC Schema Documentation

This document outlines the standard structure for all `NPC` definitions within the game cartridge. This schema provides a robust framework for creating stateful, dynamic characters with clear lifecycles and structured dialogue.

## Core NPC Schema

| Property | Type | Description |
| :--- | :--- | :--- |
| `npcId` | `NpcId` | The unique identifier for the NPC. |
| `name` | `string` | The user-facing name of the NPC. |
| `description` | `string` | The default description when the NPC is examined. |
| `image` | `ImageDetails` | (Optional) The primary portrait or image for the NPC. |
| `importance`| `string` | "primary", "supporting", or "ambient". |
| `stage` | `string` | The current lifecycle stage: "active", "completed", "demoted". |
| `dialogueType`| `string` | The primary mode of interaction: "scripted", "freeform", "tree". |
| `persona` | `string` | The AI prompt for freeform dialogue, defining personality and tone. |
| `welcomeMessage`| `string`| The initial greeting when a conversation starts. |
| `goodbyeMessage`| `string`| A default message when the conversation ends. |
| `limits` | `object` | Defines interaction cooldowns and rate limits. |
| `relations`| `object` | Tracks the player's relationship with the NPC. |
| `demoteRules`| `object` | (Optional) Defines triggers to demote the NPC to an ambient character. |
| `postCompletionProfile`| `object` | (Optional) The simplified behavior of the NPC after demotion. |
| `handlers` | `object` | A collection of handlers for specific player verbs (`onGive`, `onAskAbout`). |
| `topics` | `array` | A structured list of dialogue topics for `scripted` NPCs. |
| `knowledge`| `array` | A list of clues the NPC knows and how they can be revealed. |
| `fallbacks`| `object` | A set of default messages for unhandled or invalid dialogue inputs. |
| `version` | `object` | Versioning for schema and content. |


---

## Detailed Properties

### `importance` & `stage`
These two properties manage the NPC's lifecycle. An NPC starts as `active` and can be `demoted` to `ambient` after their plot relevance is over, based on `demoteRules`.

### `demoteRules`
Defines the conditions under which an NPC's `stage` and `importance` change.

| Property | Type | Description |
| :--- | :--- | :--- |
| `onFlagsAll` | `Flag[]` | Triggers demotion when all specified flags are set. |
| `onGiveItemsAny`| `ItemId[]` | Triggers demotion when the player gives any of these items to the NPC. |
| `onTopicCompletedAll`| `string[]` | Triggers when all specified `topicId`s have been completed (`once: true`). |
| `then` | `object` | The set of actions to perform upon demotion. |

### `postCompletionProfile`
The simplified persona and dialogue for an NPC after they have been `demoted`. This prevents players from repeatedly asking a non-essential character for clues.

### `handlers`
A collection of specific verb handlers that provide more targeted interactions than general conversation.

| Property | Type | Description |
| :--- | :--- | :--- |
| `onStartConversation` | `Handler` | Triggered when the player initiates dialogue. |
| `onEndConversation`| `Handler` | Triggered when the player ends the dialogue. |
| `onGive` | `ItemHandler[]` | Defines reactions to the player giving a specific item. |
| `onAskAbout` | `object[]` | Defines reactions to asking about a specific keyword or topic. |
| `onAccuse` | `Handler` | Defines the reaction to being accused by the player. |
| `onBribe` | `Handler` | Defines the reaction to being offered a bribe. |

### `topics`
A structured array defining the core of a `scripted` NPC's dialogue tree. Each topic can be gated by conditions.

| Property | Type | Description |
| :--- | :--- | :--- |
| `topicId` | `string` | A unique identifier for the dialogue topic. |
| `label` | `string` | An internal label for the designer. |
| `keywords` | `string[]` | An array of keywords that can trigger this topic. |
| `conditions` | `object` | Defines the requirements for this topic to be available. |
| `once` | `boolean` | If `true`, this topic can only be triggered once. |
| `response` | `InteractionResult` | The message and actions to execute when this topic is triggered. |

This schema allows for the creation of dynamic, stateful characters whose behavior and dialogue evolve as the player progresses through the story.

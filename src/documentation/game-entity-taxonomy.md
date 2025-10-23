# Game Entity Taxonomy

This document outlines the standardized archetypes for all Objects and Items within the game engine. This taxonomy serves as a "semantic map" for game designers and AI authoring tools, ensuring consistent behavior and accelerating content creation.

An entity's `archetype` property declares its fundamental type, which grants it a default set of `capabilities`, `handlers`, `fallbacks`, and `affordances` (valid verbs). Instances can then override any of these defaults to create unique behavior.

The engine resolves interactions using a clear precedence chain:
**`stateMap` override → `instance` handler → `archetype` handler → `engine` fallback.**

---

## 🧱 OBJECT TYPES

(Static or semi-static world elements — can contain, hide, or reveal items. Usually not portable.)

| Category | Description | Typical Capabilities | Common Verbs / Affordances |
| :--- | :--- | :--- | :--- |
| **Container** | Objects that hold other items. | `openable`, `lockable`, `container` | `examine`, `open`, `close`, `unlock`, `search`, `take from`, `put in` |
| **Portal** | Connectors between locations. | `openable`, `lockable`, `traversable` | `examine`, `open`, `unlock`, `enter`, `exit`, `knock` |
| **Mechanism** | Interactive controls. | `activatable`, `inputtable` | `use`, `press`, `pull`, `turn`, `input code`, `activate` |
| **Surface** | Flat surfaces that can hide things. | `examinable`, `movable` | `examine`, `move`, `look behind`, `remove`, `break` |
| **Furniture** | Environmental, often searchable objects. | `examinable`, `movable`, `container` | `examine`, `move`, `search`, `look under` |
| **Fixture** | Non-movable world details. | `examinable`, `powerable` | `examine`, `turn on/off`, `use` |
| **Device** | Complex interactive electronics. | `powerable`, `inputtable` | `turn on/off`, `use`, `read`, `input`, `hack` |
| **Prop** | Flavor items with simple interactions. | `examinable` | `examine` (with graceful fallbacks for other verbs) |
| **Hidden** | Objects not visible by default. | `revealable`, `openable` | `search`, `examine`, `open` |
| **Signage** | Readable environmental text. | `readable`, `examinable` | `examine`, `read`, `photograph` |
| **Structure** | Architectural elements. | `examinable`, `breakable` | `examine`, `break`, `inspect` |

---

## 🔑 ITEM TYPES

(Portable entities — carried by the player, traded, or consumed. Usually clues or tools.)

| Category | Description | Typical Capabilities | Common Verbs / Affordances |
| :--- | :--- | :--- | :--- |
| **Document** | Readable papers. | `readable`, `takable`, `combinable` | `examine`, `read`, `analyze` |
| **Book** | Multi-page readable items. | `readable`, `takable` | `examine`, `read` (often stateful) |
| **Media** | Digital storage requiring a device. | `usable` (req. device) | `examine`, `use`, `insert`, `analyze` |
| **Image** | Visual information. | `readable`, `examinable` | `examine`, `read`, `compare`, `scan` |
| **Key** | Items that unlock things. | `usable`, `takable`, `combinable` | `examine`, `use`, `unlock` |
| **Tool** | Items that enable actions. | `usable`, `combinable` | `use`, `combine`, `examine`, `repair` |
| **Weapon** | Items for combat or forceful interaction. | `usable`, `examinable` | `use`, `swing`, `shoot`, `reload` |
| **Consumable**| Single-use items. | `usable`, `consumable` | `use`, `eat`, `drink`, `apply` |
| **Clothing** | Wearable items. | `wearable`, `examinable` | `wear`, `remove`, `examine` |
| **Gadget** | Complex, multi-function tools. | `usable`, `powerable`, `readable` | `turn on/off`, `use`, `record`, `listen` |
| **Evidence** | Clues that can be processed. | `examinable`, `combinable`, `analyzable` | `examine`, `analyze`, `combine`, `tag` |
| **Puzzle** | Items that are part of a larger puzzle. | `combinable`, `examinable` | `examine`, `combine`, `solve`, `align` |
| **Personal** | Story-rich items tied to characters. | `readable`, `examinable` | `examine`, `read`, `show` |
| **Quest** | Items that drive the plot forward. | `examinable`, `readable` | `examine`, `read`, `mark`, `use` |

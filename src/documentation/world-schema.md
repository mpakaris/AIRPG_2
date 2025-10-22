# World-Building Schema Documentation

This document outlines the four core schemas used to build the game world: `World`, `Structure`, `Location`, and `Portal`. This architecture separates the concerns of overworld traversal (the grid), building organization, detailed scenes, and the connections between them.

---

## 1. `World` Schema

The `World` schema defines the top-level grid or map where all gameplay occurs. It is a collection of cells.

| Property | Type | Description |
| :--- | :--- | :--- |
| `worldId` | `WorldId` | The unique identifier for this world map. |
| `name` | `string` | The user-facing name of the world (e.g., "Downtown Metropolis"). |
| `cells` | `Cell[]` | An array of all the grid cells that make up this world. |
| `navEdges` | `NavEdge[]` | (Advanced) Defines conditional or special connections between cells for pathfinding. |
| `fastTravel` | `object` | (Advanced) Defines nodes and conditions for fast travel. |

### `Cell` Sub-Schema

| Property | Type | Description |
| :--- | :--- | :--- |
| `cellId` | `CellId` | Unique ID for the cell. |
| `coord` | `{x,y,z}` | The cell's 3D coordinates on the grid. |
| `type` | `string` | e.g., 'street', 'alley', 'rooftop', 'stairwell'. |
| `isPassable` | `boolean` | Can the player walk through this cell? |
| `structureId`| `StructureId`| (Optional) The ID of the building occupying this cell. |
| `portalIds` | `PortalId[]` | A list of doors, gates, or elevators present in this cell. |
| `onEnterCell`| `Handler` | Actions to trigger when a player enters this grid cell. |

---

## 2. `Structure` Schema

A `Structure` represents a building or complex site that contains one or more `Location` scenes, often spanning multiple floors.

| Property | Type | Description |
| :--- | :--- | :--- |
| `structureId`| `StructureId` | Unique ID for the building. |
| `name` | `string` | The name of the structure (e.g., "The Midnight Lounge"). |
| `kind` | `string` | The type of building (e.g., 'cafe', 'office', 'warehouse'). |
| `footprint` | `CellId[]` | An array of cell IDs that the building covers at ground level (z=0). |
| `floors` | `Floor[]` | An array defining each level of the building. |

### `Floor` Sub-Schema

| Property | Type | Description |
| :--- | :--- | :--- |
| `z` | `number` | The vertical level of this floor (e.g., 0 for ground, 1 for second floor). |
| `label` | `string` | The name of the floor (e.g., "Lobby", "Rooftop"). |
| `locationIds`| `LocationId[]`| An array of all scenes (rooms) on this floor. |

---

## 3. `Location` Schema (Scene)

A `Location` is a detailed scene where primary gameplay occurs. Players transition from the `World` grid into a `Location`.

| Property | Type | Description |
| :--- | :--- | :--- |
| `locationId` | `LocationId` | Unique ID for the scene. |
| `name` | `string` | The name of the location. |
| `sceneDescription`| `string` | The detailed description a player sees upon entering. |
| `overworldDescription`| `string` | A brief description for when viewing from the outside grid. |
| `objects` | `GameObjectId[]`| All interactive objects within this scene. |
| `npcs` | `NpcId[]` | All NPCs present in this scene. |
| `onEnterLocation` | `Handler` | Actions to trigger upon entering the scene. |

---

## 4. `Portal` Schema

A `Portal` is a first-class object that connects different scopes. It is the glue between the grid, scenes, and different floors.

| Property | Type | Description |
| :--- | :--- | :--- |
| `portalId` | `PortalId` | Unique ID for the portal. |
| `name` | `string` | The in-game name (e.g., "Front Door", "Service Ladder"). |
| `kind` | `string` | 'door', 'gate', 'window', 'ladder', 'elevator'. |
| `tags` | `string[]` | Descriptive tags for alternate routes (e.g., 'front', 'back', 'stealthy'). |
| `from` | `{scope, id}` | Defines where the portal starts (e.g., a `cell` or `location`). |
| `to` | `{scope, id}` | Defines where the portal leads. |
| `capabilities`| `object` | Defines if it's `lockable`, `climbable`, `vertical`, etc. |
| `state` | `object` | The portal's current state (`isLocked`, `isOpen`). |
| `entryEffects`| `object` | Defines flags to set or branches to trigger upon entry. |
| `handlers` | `object` | `onExamine`, `onUnlock`, `onEnter`, `onExit` handlers using the standard shape. |

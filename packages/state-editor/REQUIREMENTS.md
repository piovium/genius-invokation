# REQUIREMENTS for AI AGENTS

## Core requirement

Implement a `state-editor` i.e. a `GameState` editor, based on Solid.js, UnoCSS.

The package should export a `GameStateEditor` Solid.js component accept following props:

```ts
interface GameStateEditorProps extends HTMLDivElementProps {
  value: GameState;
  onChange: (newState: GameState) => void;
}
```

## The detail

### UI

```
+-------------------------------------+
| Game state editing                  |
+-------------------------------------+
| Player 1 state editing              |
| +----------+------------+---------+ |
| | pile     | hands      |         | |
| +----------+------------+---------+ |
| |          | combats    |         | |
| +----------+------------+---------+ |
| | supports | characters | summons | |
| +----------+------------+---------+ |
+-------------------------------------+
| Player 0 state editing              |
| +----------+------------+---------+ |
| | supports | characters | summons | |
| +----------+------------+---------+ |
| |          | combats    |         | |
| +----------+------------+---------+ |
| | pile     | hands      |         | |
| +----------+------------+---------+ |
+-------------------------------------+
```

Just like the `web-ui-core`'s layout, but editable for each entity. User can click on character/entity/card to open a modal window for detail editing including attachments, equipments and variables defined on them.

IMPORTANT: USE SIMPLIFIED CHINESE FOR TEXTS. No i18n consideration for now. 

### The editing of `GameState`

You should have a look at `core` package, under `src/base/state.ts`, to find the precise definition of `GameState`.

```ts
interface GameState {
  data: GameData;
  config: GameConfig;
  versionBehavior: VersionBehavior;
  iterators: IteratorState;
  phase: PhaseType;
  roundNumber: number;
  currentTurn: 0 | 1;
  winner: 0 | 1 | null;
  players: [PlayerState, PlayerState];
  extensions: ExtensionState[];
}
```

In UI's `Game State Editing` section:

- The `data` might be locked to the latest version for now (via imports to `@gi-tcg/data` with default settings).
- The `config` must be the default setting (via `mergeGameConfigWithDefault`), except `randomSeed`.
- The `versionBehavior` must be the default settings (via `getVersionBehavior`).
- The `iterators.random` should be the user chosen `randomSeed`.
- The `phase`, `roundNumber`, `currentTurn`, can be edit by user.
- The `winner` must be `null`.
- For `extensions` and `players`, see below.

We should grab all `character`'s `initiativeSkill` definition and group `entities` by its type, indexed by their name (run `AssetsManager#getNameSync` on it), for future use.

Set the initial `iterators.id` to -5,000,000. Each insertion of new entities (characters, attachments, cards, extensions) use this `id` and bump the `iterators.id` to the next one (e.g. -5,000,001).

### The editing of `ExtensionState`

We should initialize the `extensions` from the `data`, with it `initialState` extracted as each's state.

The `extensions` array itself cannot be modified to remove or add new extension.

For each `ExtensionState`, list their id & description inside UI, with a click-to-pop-up for editing its state.

The editing is based on the `ExtensionDefinition`'s `schema`, which is a JSON Schema. Only very limit patterned was used:
- `type: object`: Its properties should be fixed with `required`, no optional, pattern, or additional properties.
- `type: number` or `type: boolean`: Rendered as number input and radio button.
- `type: array`: If the array has a `prefixItems`, consider it as a tuple, something like:
  ```
  [0]: <Editing fields for the first element>
  [1]: <Editing fields for the second element>
  ```
  and no additional elements or removing existing element. Otherwise, the `item` must be homogeneous while editing array with appending/removing elements should be provided. 
- Any other `type` can be considered uneditable.

### The editing of `PlayerState`

```ts
interface PlayerState {
  who: 0 | 1;                                  // fixed
  initialPile: EntityDefinition[];
  pile: EntityState[];
  activeCharacterId: number;
  hands: EntityState[];
  characters: CharacterState[];
  combatStatuses: EntityState[];
  supports: EntityState[];
  summons: EntityState[];
  dice: DiceType[];
  declaredEnd: boolean;                         // editable
  hasDefeated: boolean;                         // editable
  canCharged: boolean;                          // editable
  canPlunging: boolean;                         // editable
  legendUsed: boolean;                          // editable
  skipNextTurn: boolean;                        // editable
  defeatedSwitching: boolean;                   // fixed to false
  roundSkillLog: ReadonlyMap<number, number[]>; // editable
  phaseDamageLog: unknown[];                    // fixed to []
  phaseReactionLog: unknown[];                  // fixed to []
  removedEntities: AnyState[];                  // fixed to []
}
```

All fields comment with `fixed` should be hidden and not editable.

All flags (`boolean` field) can be editable via a radio button.

`roundSkillLog` should be editable as an array of K-V pair. The Key number is chosen from a Select input from all character's definition id. The value should be an array from all character's initiative skill id, with the chosen Key character ones prioritized.

`dice` should be an editable array of `DiceType` (8 types, including 7 elemental and `Omni`). The max items of this array is `maxDiceCount` = 16.

The `initialPile`, `pile` and `characters` should be able to imported from deck share code (See `AssetsManager#decode`):
- The `characters` is the initial state (see below) of the corresponding character ID
- The `initialPile` is the definition of corresponding entity ID
- While importing, there should have options controlling each three above components will be overriden or omitted.

The `characters` should be fixed to length of 3. The default characters are 1301 (Diluc), 1103 (Kaeya), 1501 (Sucrose). Characters can swap their position by drag'n'drop or buttons. A character can be set to `active` by setting `activeCharacterId` to the corresponding character's `id`. The default active character is the first one.

The `combatStatuses` area shows icon lists and can be sorted, removed or appended by a Select input filtered to entities with type of `combatStatus`. Each one can be clicked to open a detail editing popup.

The `support`/`summon` area shows card faces of entities, which also can be sorted, removed or appended by Select inputs. Each one can be clicked to open a detail editing popup.

### The editing of pile

A popup for editing pile consist following features:
- Random shuffle.
- Manually sort cards by drag'n'drop or buttons.
- Append a new card by an entity Select input filtered to type of `support`, `equipment`, or `eventCard`. The max count of hands is `maxPileCount` = 200.
- Remove one card.
- Send to one's hand (simulating "draw") if the player's hand is not full (< 10).

For each card, an additional popup can be launched for editing variables and attachments (see below `EntityState` part).

### The editing of hands

A popup for editing hands consist following feature:
- anually sort cards by drag'n'drop or buttons.
- Append a new card by an entity Select input filtered to type of `support`, `equipment`, or `eventCard`. The max count of hands is `maxHandsCount` = 10.
- Remove one card.
- Send to support for type of `support`, to one character's area for type of `equipment`.

For each card, an additional popup can be launched for editing variables and attachments (see below `EntityState` part).

### The editing of `CharacterState`

```ts
interface CharacterState {
  id: number;                      // fixed
  definition: CharacterDefinition; // fixed
  entities: EntityState[];
  variables: {
    health: number;
    energy: number;
    maxHealth: number;
    maxEnergy: number;    // readonly
    aura: Aura;
    alive: 0 | 1;
    [x: string]?: number;
  };
}
```

For player's character, the UI should show their card face, `health`, `energy`, `maxHealth`, `maxEnergy`, `aura`, and all entities' icons (equipments and statuses).

The popup for editing characters can:
- set their `health`, `energy`, `maxHealth`, `aura`. The default value ("initial state" of character) can be read from `definition.varConfigs`. The aura must be the one of `Aura` enumeration (see `typings` package).
- set other variable values that defined inside `definition.varConfig`. The variable value must be a safe integer. 
- a button to make the character "defeated". It set `health`, `energy`, `aura` to zero, remove all entities and mark `alive` to `0`. User should be prompt to confirm. A defeated character makes variables readonly, but can be reset to alive which set `health` and `alive` to 1.
- an editable array of entities on this character area. The entity must be type of `status` or `equipment`. Clicking entry inside this array opens popup to edit `EntityState`. The entries should also be able to adjust order by drag'n'drop or buttons.

### The editing of `EntityState`

```ts
interface EntityState {
  id: number;                     // fixed
  definition: EntityDefinition;   // fixed
  variables: EntityVariables;
  attachments: AttachmentState[]; // only editable at hands/pile
}
```

A popup for editing Entities can be opened at character's `entities` editing, or player's `combatStatuses`, `summons`, or `supports`, or each card of `hands` / `pile`.

The editing consists following parts:
- The variable list of that entity. The list entries are fixed by `definition.varConfig` (cannot remove or append) and initialized ("initial state") from that. The variable value must be a safe integer. 
- If the popup is opened from `hands` / `pile`, an list for editing attachments and inner popup (similar to editing `EntityState`) can be opened for each attachment.

## Notes

- Do not forget to add `[StateSymbol]` for each level's state. Check the source code for detail.
- Make sure TypeScript do not complain errors. Be careful to use `as any` -- make explicit comment on each.


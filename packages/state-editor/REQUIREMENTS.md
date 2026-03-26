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
| | supports | characters | summons | |
| +----------+------------+---------+ |
+-------------------------------------+
| Player 0 state editing              |
| +----------+------------+---------+ |
| | supports | characters | summons | |
| +----------+------------+---------+ |
| | pile     | hands      |         | |
| +----------+------------+---------+ |
+-------------------------------------+
```

Just like the `web-ui-core`'s layout, but editable for each entity. User can click on character/entity/card to open a modal window for detail editing including attachments, equipments and variables defined on them.

### The editing of `GameState`

You should have a look at `core` package, under `src/base/state.ts`, to find the precise definition of `GameState`.

```ts
export interface GameState {
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

### The editing of `ExtensionState`

We should initialize the `extensions` from the `data`, with it `initialState` extracted as each's state.

The `extensions` array itself cannot be modified to remove or add new extension.

For each `ExtensionState`, list their id & description inside UI, with a click-to-pop-up for editing its state.

Extension state is a JSON-compatible format. While editing, its shape won't change:
- For object, it will be always an object with same set of property.
- For array, it will be 

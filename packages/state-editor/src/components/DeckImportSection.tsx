import { For, Show, createMemo, createSignal } from "solid-js";
import type { Draft } from "immer";
import type { EntityDefinition } from "@gi-tcg/core";
import { ActionButton, BooleanField, SectionTitle, Surface } from "./Fields";
import { useStateEditorContext } from "./GameStateEditor";
import { usePlayer } from "./PlayerInfoSection";
import { decodeDeckShareCode, getImageUrl } from "../state/assets";
import {
  buildImportedCharacterStates,
  buildImportedPileStates,
} from "../state/factory";
import { sortImportedCards } from "../utils";

export function DeckImportSection() {
  const { gameState, updateState } = useStateEditorContext();
  const { who } = usePlayer();
  const [shareCode, setShareCode] = createSignal("");
  const [importCharacters, setImportCharacters] = createSignal(true);
  const [importInitialPile, setImportInitialPile] = createSignal(true);
  const [importPile, setImportPile] = createSignal(true);
  const [importError, setImportError] = createSignal<string | null>(null);

  const parsedDeck = createMemo(() => {
    try {
      const code = shareCode().trim();
      if (!code) return null;
      return decodeDeckShareCode(code);
    } catch {
      return null;
    }
  });

  const characterDefinitions = createMemo(() => {
    const deck = parsedDeck();
    if (!deck) return [];
    return deck.characters
      .map((id) => gameState().data.characters.get(id))
      .filter((def) => !!def);
  });

  const cardDefinitions = createMemo(() => {
    const deck = parsedDeck();
    if (!deck) return [];
    return deck.cards
      .map((id) => gameState().data.entities.get(id))
      .filter((def) => !!def);
  });

  const handleImport = () => {
    try {
      const deck = decodeDeckShareCode(shareCode());
      if (deck.characters.length !== 3) {
        throw new Error("分享码中的角色数量不是 3。");
      }
      const importedInitialPile = importInitialPile()
        ? sortImportedCards(
            deck.cards.map((id) => {
              const definition = gameState().data.entities.get(id);
              if (!definition) {
                throw new Error(`卡牌 ${id} 不存在。`);
              }
              return definition as Draft<EntityDefinition>;
            }),
          )
        : null;
      const whoV = who();
      const importingChs = importCharacters();
      const importingPile = importPile();
      updateState((draft) => {
        const target = draft.players[whoV];
        if (importingChs) {
          target.characters = buildImportedCharacterStates(
            draft,
            deck.characters,
          );
          target.activeCharacterId = target.characters[0].id;
        }
        if (importedInitialPile) {
          target.initialPile = importedInitialPile;
        }
        if (importingPile) {
          target.pile = buildImportedPileStates(draft, deck.cards);
        }
      });
      setImportError(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <Surface title={`玩家 ${who()} 牌组导入`}>
      <div class="space-y-4">
        <SectionTitle
          title="牌组分享码导入"
          description="可分别覆盖角色、初始牌堆、当前牌堆。"
        />
        <textarea
          class="min-h-18 h-18 w-full min-w-full max-w-full box-border rounded-3xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-200/50"
          value={shareCode()}
          placeholder="输入牌组分享码"
          onInput={(event) => setShareCode(event.currentTarget.value)}
        />

        <Show when={parsedDeck()}>
          <h4 class="text-sm text-amber-50 my-0">预览</h4>
          <div class="space-y-4">
            <Show when={characterDefinitions().length > 0}>
              <div class="flex gap-2 justify-center">
                <For each={characterDefinitions()}>
                  {(character) => (
                    <div class="w-16 h-16 rounded-full overflow-hidden border border-white/20 bg-slate-800">
                      <img
                        src={getImageUrl(character, "icon")}
                        alt={`Character ${character.id}`}
                        class="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                </For>
              </div>
            </Show>

            <Show when={cardDefinitions().length > 0}>
              <div class="grid grid-cols-15 gap-1">
                <For each={cardDefinitions()}>
                  {(card) => (
                    <div class="w-full h-auto rounded-sm overflow-hidden bg-slate-800">
                      <img
                        src={getImageUrl(card, "card")}
                        alt={`Card ${card.id}`}
                        class="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </Show>

        <div class="grid gap-3 sm:grid-cols-3 pt-4">
          <BooleanField
            label="覆盖角色"
            value={importCharacters()}
            onChange={setImportCharacters}
          />
          <BooleanField
            label="覆盖初始牌堆"
            value={importInitialPile()}
            onChange={setImportInitialPile}
          />
          <BooleanField
            label="覆盖当前牌堆"
            value={importPile()}
            onChange={setImportPile}
          />
        </div>
        <div class="flex flex-wrap gap-2">
          <ActionButton
            label="导入分享码"
            tone="accent"
            onClick={handleImport}
            class="w-full"
          />
        </div>
        <Show when={importError()}>
          <p class="text-sm text-rose-200">{importError()}</p>
        </Show>
      </div>
    </Surface>
  );
}

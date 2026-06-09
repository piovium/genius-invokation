import { defineViewModel, type AR } from "@gi-tcg/gts-runtime";
import { CharacterViewModel } from "./character";

class RootModel {}

export default defineViewModel(RootModel, (h) => ({
  character: h.attribute<{
    (): AR.With<typeof CharacterViewModel>,
  }>((model, [], subView) => {
    const character = CharacterViewModel.parse(subView);
    console?.warn?.("parsed!")
  }),
}));

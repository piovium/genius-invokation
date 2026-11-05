# Copyright (C) 2024-2025 Guyutongxue
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

from abc import ABC, abstractmethod
from .proto.notification_pb2 import Notification
from .proto.rpc_pb2 import (
    Request,
    Response,
    ChooseActiveRequest,
    ChooseActiveResponse,
    RerollDiceRequest,
    RerollDiceResponse,
    SelectCardRequest,
    SelectCardResponse,
    SelectOptionRequest,
    SelectOptionResponse,
    SwitchHandsRequest,
    SwitchHandsResponse,
    ActionRequest,
    ActionResponse,
)


class Player(ABC):
    """
    An abstract class (interface) of a player of GI-TCG Game.

    A player can receive `notification` by `gitcg.Player.on_notify`. The notification includes:
    - Game state information that is visible to this player, and
    - All mutation information since last notification.

    The `gitcg.Notification` class is generated from Protocol Buffer, its detailed structure is listed [here](https://github.com/piovium/genius-invokation/blob/main/proto/notification.proto).

    A player can handle 5 types of "requests", which are:
    - `action`, when a player action is requested.
    - `chooseActive`, when a player is requested to choose an active character. This usually happens on the initialize phase or the previous active character was defeated.
    - `rerollDice`, when a player is requested to reroll dice. This usually happens on the roll phase.
    - `selectCard`, when a player is requested to select a card. This is the effects of some cards / skills like Chiori.
    - `switchHands`, when a player is requested to switch some cards from/to his hands and pile. This happens on the initialize phase.

    All above requests and responses class are generated from Protocol Buffer, their detailed structure can be found [here](https://github.com/piovium/genius-invokation/blob/main/proto/rpc.proto).
    """

    def on_notify(self, notification: Notification):
        """
        The player receives `Notification` that includes state and mutation info.
        
        **Notice**: your dice and hand cards are provided from here as part of state data. You should use them to determine how to response following `rerollDice` and `switchHands` requests. 
        """
        pass

    def on_io_error(self, error_msg: str):
        """
        When IO error happens (e.g. wrong response format, wrong dice usage, etc.), you can receive the error message from this handler.

        When you've made an IO error, the opponents would automatically win and the game would step to `gitcg.GameStatus.FINISHED`.
        """
        pass

    def _on_rpc(self, request: Request) -> Response:
        if request.HasField("choose_active"):
            return Response(choose_active=self.on_choose_active(request.choose_active))
        elif request.HasField("reroll_dice"):
            return Response(reroll_dice=self.on_reroll_dice(request.reroll_dice))
        elif request.HasField("select_option"):
            return Response(select_option=self.on_select_option(request.select_option))
        elif request.HasField("select_card"):
            return Response(select_card=self.on_select_card(request.select_card))
        elif request.HasField("switch_hands"):
            return Response(switch_hands=self.on_switch_hands(request.switch_hands))
        elif request.HasField("action"):
            return Response(action=self.on_action(request.action))
        return Response()

    def on_select_option(self, request: SelectOptionRequest) -> SelectOptionResponse:
        return SelectOptionResponse(selected_index=0)

    @abstractmethod
    def on_choose_active(self, request: ChooseActiveRequest) -> ChooseActiveResponse:
        """
        Implement the logic of how to `chooseActive`. The returned `ChooseActiveResoponse` must be presented with an id listed in `gitcg.ChooseActiveRequest`'s `candidate_ids`.

        For example, select the first candidate:
        ```py
        def on_choose_active(self, request: ChooseActiveRequest) -> ChooseActiveResponse:
            return ChooseActiveResponse(active_character_id=request.candidate_ids[0])
        ```
        """
        pass

    @abstractmethod
    def on_reroll_dice(self, request: RerollDiceRequest) -> RerollDiceResponse:
        """
        Implement the logic of how to `rerollDice`. The returned `RerollDiceResponse` consists a list `dice_to_reroll` includes which dice you want to reroll. The dice information is shown on a previous `on_notify` notification.

        For example, do not reroll any dice:
        ```py
        def on_reroll_dice(self, request: RerollDiceRequest) -> RerollDiceResponse:
            return RerollDiceResponse() # or RerollDiceResponse(dice_to_reroll=[])
        ```
        """
        pass

    @abstractmethod
    def on_select_card(self, request: SelectCardRequest) -> SelectCardResponse:
        """
        Implement the logic of how to `selectCard`. The returned `SelectCardResponse` must be presented with an id listed in `gitcg.SelectCardRequest`'s `candidate_definition_ids`.

        For example, select the first candidate:
        ```py
        def on_select_card(self, request: SelectCardRequest) -> SelectCardResponse:
            return SelectCardResponse(selected_definition_id=request.candidate_definition_ids[0])
        ```
        """
        pass

    @abstractmethod
    def on_switch_hands(self, request: SwitchHandsRequest) -> SwitchHandsResponse:
        """
        Implement the logic of how to `switchHands`. The returned `SwitchHandsResponse` must be presented with a list of `removed_hand_ids` that you want to remove from your hands. You will receive same amount of cards from your pile later.

        For example, do not switch any card:
        ```py
        def on_switch_hands(self, request: SwitchHandsRequest) -> SwitchHandsResponse:
            return SwitchHandsResponse() # or SwitchHandsResponse(removed_hand_ids=[])
        """
        pass

    @abstractmethod
    def on_action(self, request: ActionRequest) -> ActionResponse:
        """
        Implement the logic of how to `action`. The `ActionRequest` contains a list of actions you can perform. The returned `ActionResponse` must be presented with an index of the action you want to perform, and some `used_dice` values as this action's cost requirement.

        There are 5 kind of actions, called `use_skill`, `play_card`, `elemenental_tuning`, `switch_active` and `declare_end`. While enumerating `action` on `ActionRequest`, check `action.HasField("use_skill")` to determine which kind of this action is. Then `action.use_skill` will contains detailed information of this action. The detailed data structure of `ActionRequest` can be found [here](https://github.com/guyutongxue/genius-invokation/blob/main/proto/action.proto).

        For example, choose the `declare_end` action:
        ```py
        def on_action(self, request: ActionRequest) -> ActionResponse:
            chosen_index = 0
            for i, action in enumerate(request.action):
                if action.HasField("declare_end"):
                    chosen_index = i
                    break
            # Because no dice required for declare_end, so just omitting `used_dice=[]` argument.
            return ActionResponse(chosen_action_index=chosen_index)
        ```

        Here is a little bit complex example: omni-only-random-action player. This player will only consume OMNI dice to perform a random action. For better test result, set `low_level.ATTR_PLAYER_ALWAYS_OMNI_0`(`1`) in `gitcg.game.set_attr` to make this player always receive OMNI dice on initial roll.
        ```py
        class RandomActionPlayer(Player):
            who: int
            omni_dice_count = 0 # record dice count of OMNI
            def __init__(self, who: int):
                self.who = who

            def on_notify(self, notification):
                self.omni_dice_count = len([i for i in notification.state.player[self.who].dice if i == DiceType.DICE_OMNI])

            def on_action(self, request: ActionRequest) -> ActionResponse:
                chosen_index = 0
                used_dice: list[DiceType] = []
                actions = list(enumerate(request.action))
                random.shuffle(actions)
                # select the first action (from shuffled list) that can be performed by current OMNI dice.
                for i, action in actions:
                    required_count = 0
                    has_non_dice_requirement = False
                    if action.HasField("elemental_tuning"):
                        continue
                    for req in list(action.required_cost):
                        if req.type == DiceRequirementType.DICE_REQ_ENERGY or req.type == DiceRequirementType.DICE_REQ_LEGEND:
                            has_non_dice_requirement = True
                        else:
                            required_count += req.count
                    if has_non_dice_requirement:
                        continue
                    if required_count > self.omni_dice_count:
                        continue
                    chosen_index = i
                    used_dice = [DiceType.DICE_OMNI] * required_count
                    break
                return ActionResponse(chosen_action_index=chosen_index, used_dice=used_dice)
        ```
        """
        pass

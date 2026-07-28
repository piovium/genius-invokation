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

from __future__ import annotations
from cffi import FFI

from .create_param import CreateParam
from .entity import Entity
from . import low_level as ll


class State:
    """
    A readonly state of a GI-TCG game. You can execute `gitcg.State.query` on it.
    """

    _state_handle: FFI.CData = ll.NULL

    def __init__(
        self,
        /,
        create_param: CreateParam | None = None,
        json: str | None = None,
        handle: FFI.CData | None = None,
    ):
        """
        Create a state from an `gitcg.CreateParam`, or from a JSON representation.

        **Notice**: The JSON representation is not stable. We only guarantee that the JSON string produced from `gitcg.State.json` from the same version of this library is valid. We encourage to use `gitcg.State.query` to extract detailed state data.
        """
        if create_param is not None:
            self._state_handle = ll.state_new(create_param._createparam_handle)
        elif json is not None:
            self._state_handle = ll.state_from_json(json)
        elif handle is not None:
            self._state_handle = handle
        else:
            raise ValueError("either create_param, json or handle must be provided")

    def json(self) -> str:
        """
        Returns the json representation of this state.
        """
        return ll.state_to_json(self._state_handle)

    def query(self, who: int, query: str) -> list[Entity]:
        """
        Execute an S-expression query on `who`'s perspective. The query syntax
        can be found [here](https://github.com/piovium/genius-invokation/tree/main/docs/development/query).
        ```py
        state.query(0, "(intersection (who my) (type character))")
        # returns my character information
        ```
        """
        assert who == 0 or who == 1
        return [
            Entity(handle) for handle in ll.state_query(self._state_handle, who, query)
        ]

    def round_number(self) -> int:
        return ll.state_get_attr(self._state_handle, ll.ATTR_STATE_ROUND_NUMBER)

    def current_turn(self) -> int:
        return ll.state_get_attr(self._state_handle, ll.ATTR_STATE_CURRENT_TURN)

    def winner(self) -> int | None:
        winner = ll.state_get_attr(self._state_handle, ll.ATTR_STATE_WINNER)
        if winner == -1:
            return None
        return winner
    
    def _get_player_flag(self, who: int, p0_attr: int) -> bool:
        assert who == 0 or who == 1
        return bool(ll.state_get_attr(self._state_handle, p0_attr + who))

    def player_declared_end(self, who: int) -> bool:
        return self._get_player_flag(who, ll.ATTR_STATE_PLAYER_DECLARED_END_0)

    def player_has_defeated(self, who: int) -> bool:
        return self._get_player_flag(who, ll.ATTR_STATE_PLAYER_HAS_DEFEATED_0)

    def player_can_charged(self, who: int) -> bool:
        return self._get_player_flag(who, ll.ATTR_STATE_PLAYER_CAN_CHARGED_0)

    def player_can_plunging(self, who: int) -> bool:
        return self._get_player_flag(who, ll.ATTR_STATE_PLAYER_CAN_PLUNGING_0)

    def player_legend_used(self, who: int) -> bool:
        return self._get_player_flag(who, ll.ATTR_STATE_PLAYER_LEGEND_USED_0)

    def get_dice(self, who: int) -> list[int]:
        assert who == 0 or who == 1
        return ll.state_get_dice(self._state_handle, who)

    def __del__(self):
        ll.state_free(self._state_handle)

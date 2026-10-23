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
from enum import Enum

from .player import Player
from .create_param import CreateParam
from .state import State
from . import low_level as ll
from .proto.rpc_pb2 import Request
from .proto.notification_pb2 import Notification

class _GameCallback(ll.ICallback):
    _player: Player

    def __init__(self, player: Player):
        self._player = player

    def on_rpc(self, request: bytes) -> bytes:
        request_msg = Request()
        request_msg.ParseFromString(request)
        response_msg = self._player._on_rpc(request_msg)
        return response_msg.SerializeToString()

    def on_notify(self, notification: bytes):
        notification_msg = Notification()
        notification_msg.ParseFromString(notification)
        self._player.on_notify(notification_msg)

    def on_io_error(self, error_msg: str):
        self._player.on_io_error(error_msg)


class GameStatus(Enum):
    """
    Represent the status of `gitcg.Game`.
    - If a `gitcg.Game`'s status is `NOT_STARTED`, it can be started.
    - If a `gitcg.Game`'s status is `RUNNING`, it can be stepped through.
    - If a `gitcg.Game`'s status is `FINISHED` or `ABORTED`, it cannot be used anymore.
    - If a `gitcg.Game`'s status is `FINISHED`, it can be queried for the winner.
    - If a `gitcg.Game`'s status is `ABORTED`, one can query its error message using `gitcg.Game.error`.
    """
    NOT_STARTED = ll.GAME_STATUS_NOT_STARTED
    RUNNING = ll.GAME_STATUS_RUNNING
    FINISHED = ll.GAME_STATUS_FINISHED
    ABORTED = ll.GAME_STATUS_ABORTED


class Game:
    """
    A GI-TCG Game instance. It can be created with a `gitcg.State` or a `gitcg.CreateParam`.
    ```py
    game = Game(create_param=CreateParam(deck0=DECK0, deck1=DECK1))
    ```
    
    The game can be started and stepped through. A game instance can only be used once.
    ```py
    game.start()
    while game.is_running():
        game.step()
    ```
    """

    _game_handle: FFI.CData = ll.NULL
    _players: list[Player | None]
    _player_callbacks: list[_GameCallback | None]
    _player_callback_handles: list[FFI.CData | None]

    def __init__(
        self, /, state: State | None = None, create_param: CreateParam | None = None
    ):
        """
        Construct game from an initial `gitcg.State` or from a `gitcg.CreateParam`.

        `Game(create_param=cp)` is a shortcut to `Game(state=State(create_param=cp))`.
        """
        self._players = [None, None]
        self._player_callbacks = [None, None]
        self._player_callback_handles = [None, None]

        if state is not None:
            self._game_handle = ll.game_new(state._state_handle)
        elif create_param is not None:
            state = State(create_param=create_param)
            self._game_handle = ll.game_new(state._state_handle)
        else:
            raise ValueError("either state or create_param must be provided")

    def set_player(self, who: int, player: Player):
        """
        Set the player behavior of this game.
        A player is an implementation of interface `gitcg.Player`.
        """
        assert who == 0 or who == 1
        callback = _GameCallback(player)
        self._player_callbacks[who] = callback
        handle = ll.game_set_handlers(self._game_handle, who, callback)
        self._player_callback_handles[who] = handle
        self._players[who] = player

    def set_attr(self, key: int, value: int):
        """
        Set some controlling attributes to the game.
        Available attributes can be found in `gitcg.low_level`:
        - `gitcg.low_level.ATTR_PLAYER_ALWAYS_OMNI_0`
        - `gitcg.low_level.ATTR_PLAYER_ALWAYS_OMNI_1`
        - `gitcg.low_level.ATTR_PLAYER_ALLOW_TUNING_ANY_DICE_0`
        - `gitcg.low_level.ATTR_PLAYER_ALLOW_TUNING_ANY_DICE_1`
        """
        ll.game_set_attr(self._game_handle, key, value)


    def start(self):
        """
        Start the game. Precondition: `status() == GameStatus.NOT_STARTED`.
        """
        assert self.status() == GameStatus.NOT_STARTED
        ll.game_step(self._game_handle)

    def step(self):
        """
        Step the game to next pause point. Precondition: `status() == GameStatus.RUNNING`.
        """
        assert self.status() == GameStatus.RUNNING
        ll.game_step(self._game_handle)

    def status(self) -> GameStatus:
        return GameStatus(ll.game_get_status(self._game_handle))

    def is_running(self) -> bool:
        return self.status() == GameStatus.RUNNING

    def state(self) -> State:
        """
        Get the `gitcg.State` of this game.
        """
        return State(handle=ll.game_get_state(self._game_handle))

    def is_resumable(self) -> bool:
        """
        Whether current `gitcg.State` of this game is resumable, i.e. can be used to create a new game.
        """
        return ll.game_is_resumable(self._game_handle)

    def error(self) -> str | None:
        """
        If this game is aborted, return the error message.
        """
        assert self.status() == GameStatus.ABORTED
        return ll.game_get_error(self._game_handle)

    def json(self) -> str:
        """
        Returns the json representation of the current `gitcg.State` of this game.
        """
        return self.state().json()

    def winner(self):
        return self.state().winner()

    def round_number(self):
        return self.state().round_number()

    def current_turn(self):
        return self.state().current_turn()

    def __del__(self):
        ll.game_free(self._game_handle)

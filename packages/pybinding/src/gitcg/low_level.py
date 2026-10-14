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

"""
Low-level interface that directly describes the underlying C-binding.
"""

from __future__ import annotations
import os
from cffi import FFI
from typing import Any
from abc import ABC, abstractmethod

from ._gitcg_cffi import ffi

_LIB_PATH = [
    "libgitcg.so",
    "libgitcg.dylib",
    "gitcg.dll",
]

C: Any = None
for lib in _LIB_PATH:
    path = os.path.join(os.path.dirname(__file__), lib)
    if os.path.exists(path):
        C = ffi.dlopen(path)
        break
if C is None:
    raise ImportError("Cannot find libgitcg library file")

NULL = ffi.NULL

SET_DECK_CHARACTERS: int = C.GITCG_SET_DECK_CHARACTERS
SET_DECK_CARDS: int = C.GITCG_SET_DECK_CARDS

GAME_STATUS_NOT_STARTED: int = C.GITCG_GAME_STATUS_NOT_STARTED
GAME_STATUS_RUNNING: int = C.GITCG_GAME_STATUS_RUNNING
GAME_STATUS_FINISHED: int = C.GITCG_GAME_STATUS_FINISHED
GAME_STATUS_ABORTED: int = C.GITCG_GAME_STATUS_ABORTED

ATTR_CREATEPARAM_DATA_VERSION = C.GITCG_ATTR_CREATEPARAM_DATA_VERSION
ATTR_STATE_CONFIG_RANDOM_SEED = C.GITCG_ATTR_STATE_CONFIG_RANDOM_SEED
ATTR_STATE_CONFIG_INITIAL_HANDS_COUNT = C.GITCG_ATTR_STATE_CONFIG_INITIAL_HANDS_COUNT
ATTR_STATE_CONFIG_MAX_HANDS_COUNT = C.GITCG_ATTR_STATE_CONFIG_MAX_HANDS_COUNT
ATTR_STATE_CONFIG_MAX_ROUNDS_COUNT = C.GITCG_ATTR_STATE_CONFIG_MAX_ROUNDS_COUNT
ATTR_STATE_CONFIG_MAX_SUPPORTS_COUNT = C.GITCG_ATTR_STATE_CONFIG_MAX_SUPPORTS_COUNT
ATTR_STATE_CONFIG_MAX_SUMMONS_COUNT = C.GITCG_ATTR_STATE_CONFIG_MAX_SUMMONS_COUNT
ATTR_STATE_CONFIG_INITIAL_DICE_COUNT = C.GITCG_ATTR_STATE_CONFIG_INITIAL_DICE_COUNT
ATTR_STATE_CONFIG_MAX_DICE_COUNT = C.GITCG_ATTR_STATE_CONFIG_MAX_DICE_COUNT
ATTR_CREATEPARAM_NO_SHUFFLE_0 = C.GITCG_ATTR_CREATEPARAM_NO_SHUFFLE_0
ATTR_CREATEPARAM_NO_SHUFFLE_1 = C.GITCG_ATTR_CREATEPARAM_NO_SHUFFLE_1
ATTR_PLAYER_ALWAYS_OMNI_0 = C.GITCG_ATTR_PLAYER_ALWAYS_OMNI_0
ATTR_PLAYER_ALWAYS_OMNI_1 = C.GITCG_ATTR_PLAYER_ALWAYS_OMNI_1
ATTR_PLAYER_ALLOW_TUNING_ANY_DICE_0 = C.GITCG_ATTR_PLAYER_ALLOW_TUNING_ANY_DICE_0
ATTR_PLAYER_ALLOW_TUNING_ANY_DICE_1 = C.GITCG_ATTR_PLAYER_ALLOW_TUNING_ANY_DICE_1
ATTR_STATE_PHASE = C.GITCG_ATTR_STATE_PHASE
ATTR_STATE_ROUND_NUMBER = C.GITCG_ATTR_STATE_ROUND_NUMBER
ATTR_STATE_CURRENT_TURN = C.GITCG_ATTR_STATE_CURRENT_TURN
ATTR_STATE_WINNER = C.GITCG_ATTR_STATE_WINNER
ATTR_STATE_PLAYER_DECLARED_END_0 = C.GITCG_ATTR_STATE_PLAYER_DECLARED_END_0
ATTR_STATE_PLAYER_DECLARED_END_1 = C.GITCG_ATTR_STATE_PLAYER_DECLARED_END_1
ATTR_STATE_PLAYER_HAS_DEFEATED_0 = C.GITCG_ATTR_STATE_PLAYER_HAS_DEFEATED_0
ATTR_STATE_PLAYER_HAS_DEFEATED_1 = C.GITCG_ATTR_STATE_PLAYER_HAS_DEFEATED_1
ATTR_STATE_PLAYER_CAN_CHARGED_0 = C.GITCG_ATTR_STATE_PLAYER_CAN_CHARGED_0
ATTR_STATE_PLAYER_CAN_CHARGED_1 = C.GITCG_ATTR_STATE_PLAYER_CAN_CHARGED_1
ATTR_STATE_PLAYER_LEGEND_USED_0 = C.GITCG_ATTR_STATE_PLAYER_LEGEND_USED_0
ATTR_STATE_PLAYER_LEGEND_USED_1 = C.GITCG_ATTR_STATE_PLAYER_LEGEND_USED_1
ATTR_STATE_PLAYER_SKIP_NEXT_TURN_0 = C.GITCG_ATTR_STATE_PLAYER_SKIP_NEXT_TURN_0
ATTR_STATE_PLAYER_SKIP_NEXT_TURN_1 = C.GITCG_ATTR_STATE_PLAYER_SKIP_NEXT_TURN_1


def _cdata_to_string(cdata: Any) -> str:
    b: bytes = ffi.string(cdata)  # type: ignore
    return b.decode("utf-8")


def version() -> str:
    return _cdata_to_string(C.gitcg_version())


def initialize():
    C.gitcg_initialize()


def cleanup():
    C.gitcg_cleanup()


def thread_initialize():
    C.gitcg_thread_initialize()


def thread_cleanup():
    C.gitcg_thread_cleanup()


def state_createpram_new() -> FFI.CData:
    createparam = ffi.new("gitcg_state_createparam_t[1]")
    assert C.gitcg_state_createparam_new(createparam) == 0
    return createparam[0]


def state_createpram_free(createparam: FFI.CData):
    C.gitcg_state_createparam_free(createparam)


def state_createparam_set_attr(createparam: FFI.CData, key: int, value: int | str):
    if isinstance(value, int):
        assert C.gitcg_state_createparam_set_attr_int(createparam, key, value) == 0
    elif isinstance(value, str):
        assert (
            C.gitcg_state_createparam_set_attr_string(
                createparam, key, value.encode("utf-8")
            )
            == 0
        )
    else:
        raise TypeError("value must be int or str")


def state_createparam_set_deck(
    createparam: FFI.CData, who: int, character_or_cards: int, deck: list[int]
):
    deck_array = ffi.new("int[]", deck)
    assert (
        C.gitcg_state_createparam_set_deck(
            createparam, who, character_or_cards, deck_array, len(deck)
        )
        == 0
    )


def state_new(createparam: FFI.CData):
    state = ffi.new("gitcg_state_t[1]")
    assert C.gitcg_state_new(createparam, state) == 0
    return state[0]


def state_free(state: FFI.CData):
    C.gitcg_state_free(state)


def state_to_json(state: FFI.CData) -> str:
    string_ptr = ffi.new("char*[1]")
    assert C.gitcg_state_to_json(state, string_ptr) == 0
    py_string = _cdata_to_string(string_ptr[0])
    C.gitcg_free_buffer(string_ptr[0])
    return py_string


def state_from_json(json: str) -> FFI.CData:
    state = ffi.new("gitcg_state_t[1]")
    assert C.gitcg_state_from_json(json.encode("utf-8"), state) == 0
    return state[0]


def state_get_attr(state: FFI.CData, key: int) -> int:
    value = ffi.new("int[1]")
    assert C.gitcg_state_get_attr_int(state, key, value) == 0
    return value[0]


def state_get_dice(state: FFI.CData, who: int) -> list[int]:
    length = state_get_attr(state, C.GITCG_ATTR_STATE_CONFIG_MAX_DICE_COUNT)
    dice_array = ffi.new("int[]", length)
    assert C.gitcg_state_get_dice(state, who, dice_array) == 0
    return list(dice_array)


def entity_free(entity: FFI.CData):
    C.gitcg_entity_free(entity)


def state_query(state: FFI.CData, who: int, query: str) -> list[FFI.CData]:
    result = ffi.new("gitcg_entity_t*[1]")
    length = ffi.new("size_t[1]")
    assert C.gitcg_state_query(state, who, query.encode("utf-8"), result, length) == 0
    array: list[FFI.CData] = ffi.unpack(result[0], length[0])  # type: ignore
    C.gitcg_free_buffer(result[0])
    return array


def entity_get_id(entity: FFI.CData) -> int:
    value = ffi.new("int[1]")
    assert C.gitcg_entity_get_id(entity, value) == 0
    return value[0]


def entity_get_definition_id(entity: FFI.CData) -> int:
    value = ffi.new("int[1]")
    assert C.gitcg_entity_get_definition_id(entity, value) == 0
    return value[0]


def entity_get_variable(entity: FFI.CData, variable_name: str) -> int:
    value = ffi.new("int[1]")
    assert (
        C.gitcg_entity_get_variable(entity, variable_name.encode("utf-8"), value) == 0
    )
    return value[0]


def game_new(state: FFI.CData) -> FFI.CData:
    game = ffi.new("gitcg_game_t[1]")
    assert C.gitcg_game_new(state, game) == 0
    return game[0]


def game_free(game: FFI.CData):
    C.gitcg_game_free(game)


class ICallback(ABC):
    @abstractmethod
    def on_rpc(self, request: bytes) -> bytes:
        pass

    @abstractmethod
    def on_notify(self, notification: bytes):
        pass

    @abstractmethod
    def on_io_error(self, error_msg: str):
        pass


@ffi.callback(
    """
void (*gitcg_rpc_handler)(void* player_data, const char* request_data,
                          size_t request_len, char* response_data,
                          size_t* response_len)
"""
)
def _on_rpc_handler(
    data: FFI.CData,
    request: FFI.CData,
    request_length: int,
    response: FFI.CData,
    response_length: FFI.CData,
) -> None:
    callback_obj = ffi.from_handle(data)
    request_bytes = ffi.buffer(request, request_length)[:]
    response_bytes = callback_obj.on_rpc(request_bytes)
    response_length[0] = len(response_bytes)
    ffi.memmove(response, response_bytes, len(response_bytes))


@ffi.callback(
    """
void (*gitcg_notification_handler)(void* player_data,
                                   const char* notification_data,
                                   size_t notification_len)     
"""
)
def _on_notify_handler(
    data: FFI.CData, notification: FFI.CData, notification_length: int
) -> None:
    callback_obj = ffi.from_handle(data)
    notification_bytes = ffi.buffer(notification, notification_length)[:]
    callback_obj.on_notify(notification_bytes)


@ffi.callback(
    """
void (*gitcg_io_error_handler)(void* player_data,
                               const char* error_message)
"""
)
def _on_io_error_handler(data: FFI.CData, error_msg: FFI.CData) -> None:
    callback_obj = ffi.from_handle(data)
    callback_obj.on_io_error(_cdata_to_string(error_msg))


def game_set_handlers(game: FFI.CData, who: int, handlers: ICallback):
    """
    returns the cffi "handle" towards the ICallback object.
    the "handle" must be long lived until the ICallback object is no longer needed.
    """
    data = ffi.new_handle(handlers)
    C.gitcg_game_set_player_data(game, who, data)
    C.gitcg_game_set_rpc_handler(game, who, _on_rpc_handler)
    C.gitcg_game_set_notification_handler(game, who, _on_notify_handler)
    C.gitcg_game_set_io_error_handler(game, who, _on_io_error_handler)
    return data


def game_set_attr(game: FFI.CData, key: int, value: int):
    assert C.gitcg_game_set_attr_int(game, key, value) == 0


def game_get_attr(game: FFI.CData, key: int) -> int:
    value = ffi.new("int[1]")
    assert C.gitcg_game_get_attr_int(game, key, value) == 0
    return value[0]


def game_step(game: FFI.CData):
    assert C.gitcg_game_step(game) == 0


def game_get_state(game: FFI.CData) -> FFI.CData:
    state = ffi.new("gitcg_state_t[1]")
    assert C.gitcg_game_get_state(game, state) == 0
    return state[0]


def game_get_status(game: FFI.CData) -> int:
    value = ffi.new("int[1]")
    assert C.gitcg_game_get_status(game, value) == 0
    return value[0]


def game_is_resumable(game: FFI.CData) -> bool:
    value = ffi.new("int[1]")
    assert C.gitcg_game_is_resumable(game, value) == 0
    return bool(value[0])


def game_get_winner(game: FFI.CData) -> int:
    value = ffi.new("int[1]")
    assert C.gitcg_game_get_winner(game, value) == 0
    return value[0]


def game_get_error(game: FFI.CData) -> str | None:
    string_ptr = ffi.new("char*[1]")
    assert C.gitcg_game_get_error(game, string_ptr) == 0
    if string_ptr[0] == ffi.NULL:
        return None
    py_string = _cdata_to_string(string_ptr[0])
    C.gitcg_free_buffer(string_ptr[0])
    return py_string

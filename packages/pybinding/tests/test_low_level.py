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

import unittest
from gitcg import low_level

class EmptyPlayerHandler(low_level.ICallback):
    def __init__(self, who: int):
        self.who = who

    def on_rpc(self, request: bytes) -> bytes:
        return b""

    def on_notify(self, notification: bytes):
        pass

    def on_io_error(self, error_msg: str):
        print(self.who, error_msg)
        pass

class TestLowLevelGitcg(unittest.TestCase):
    def test_version(self):
        version = low_level.version()
        print("VERSION: ", version)
        self.assertIsInstance(version, str)

    def test_low_level_api(self):
        # low_level.initialize()
        # low_level.thread_initialize()

        createparam = low_level.state_createpram_new()
        self.assertIsNotNone(createparam)
        low_level.state_createparam_set_deck(createparam, 0, 1, [1411, 1510, 2103])
        low_level.state_createparam_set_deck(createparam, 0, 2, [
            214111, 214111, 215101, 311503, 312004, 312004, 312025, 312025,
            312029, 312029, 321002, 321011, 321016, 321016, 322002, 322009,
            322009, 330008, 332002, 332002, 332004, 332004, 332005, 332005,
            332006, 332006, 332018, 332025, 333004, 333004
        ])
        low_level.state_createparam_set_deck(createparam, 1, 1, [1609, 2203, 1608])
        low_level.state_createparam_set_deck(createparam, 1, 2, [
            312025, 321002, 321002, 321011, 322025, 323004, 323004, 330005,
            331601, 331601, 332002, 332003, 332003, 332004, 332004, 332005,
            332005, 332006, 332025, 332025, 333003, 333003
        ])
        state = low_level.state_new(createparam)
        low_level.state_createpram_free(createparam)

        json = low_level.state_to_json(state)
        # print(json)

        entities = low_level.state_query(
            state, 0, "(intersection (who my) (area pile true))"
        )
        self.assertEqual(len(entities), 30)
        first_def_id = low_level.entity_get_definition_id(entities[0])
        self.assertIsInstance(first_def_id, int)
        for entity in entities:
            low_level.entity_free(entity)

        low_level.state_free(state)

        state2 = low_level.state_from_json(json)

        game = low_level.game_new(state2)
        low_level.state_free(state2)
        player0 = EmptyPlayerHandler(0)
        player1 = EmptyPlayerHandler(1)
        player0_h = low_level.game_set_handlers(game, 0, player0)
        player1_h = low_level.game_set_handlers(game, 1, player1)

        low_level.game_step(game)
        status = 1
        while status == 1: # running
            low_level.game_step(game)
            status = low_level.game_get_status(game)

        low_level.game_free(game)
        print(player0_h)
        print(player1_h)
        del player0_h
        del player1_h

        # low_level.thread_cleanup()
        # low_level.cleanup()

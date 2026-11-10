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
.. include:: ../../README.md
"""

from . import low_level
from .env import thread_initialize, thread_cleanup
from .game import Game, GameStatus
from .player import Player
from .state import State
from .create_param import CreateParam, Deck
from .entity import Entity
from . import proto
from .proto import ActionRequest, ActionResponse, RerollDiceRequest, RerollDiceResponse, ChooseActiveRequest, ChooseActiveResponse, SelectCardRequest, SelectCardResponse, SelectOption, SelectOptionRequest, SelectOptionResponse, SwitchHandsRequest, SwitchHandsResponse, Notification, Action, ActionValidity, DiceRequirementType, DiceRequirement, DiceType

__all__ = [
    "thread_initialize",
    "thread_cleanup",
    "Game",
    "GameStatus",
    "Player",
    "State",
    "CreateParam",
    "Deck",
    "Entity",
    "ActionRequest",
    "ActionResponse",
    "RerollDiceRequest",
    "RerollDiceResponse",
    "ChooseActiveRequest",
    "ChooseActiveResponse",
    "SelectCardRequest",
    "SelectCardResponse",
    "SelectOption",
    "SelectOptionRequest",
    "SelectOptionResponse",
    "SwitchHandsRequest",
    "SwitchHandsResponse",
    "Notification",
    "Action",
    "ActionValidity",
    "DiceRequirementType",
    "DiceRequirement",
    "DiceType",
    "proto",
    "low_level",
]

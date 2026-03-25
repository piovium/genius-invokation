// Copyright (C) 2024-2025 Guyutongxue
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

#pragma once
#ifndef GITCG_H
#define GITCG_H

#include <stdlib.h>

#ifdef _WIN32
#ifdef GITCG_API_EXPORTS
#define GITCG_API __declspec(dllexport)
#else
#define GITCG_API __declspec(dllimport)
#endif
#else
#define GITCG_API
#endif

#ifdef __cplusplus
extern "C" {
#endif

// >>> API declarations

// >>> generated macros
#define GITCG_CORE_VERSION "0.19.1"
#define GITCG_ATTR_CREATEPARAM_DATA_VERSION 101
#define GITCG_ATTR_STATE_CONFIG_RANDOM_SEED 102
#define GITCG_ATTR_STATE_CONFIG_INITIAL_HANDS_COUNT 103
#define GITCG_ATTR_STATE_CONFIG_MAX_HANDS_COUNT 104
#define GITCG_ATTR_STATE_CONFIG_MAX_ROUNDS_COUNT 105
#define GITCG_ATTR_STATE_CONFIG_MAX_SUPPORTS_COUNT 106
#define GITCG_ATTR_STATE_CONFIG_MAX_SUMMONS_COUNT 107
#define GITCG_ATTR_STATE_CONFIG_INITIAL_DICE_COUNT 108
#define GITCG_ATTR_STATE_CONFIG_MAX_DICE_COUNT 109
#define GITCG_ATTR_CREATEPARAM_NO_SHUFFLE_0 2000
#define GITCG_ATTR_CREATEPARAM_NO_SHUFFLE_1 2001
#define GITCG_ATTR_PLAYER_ALWAYS_OMNI_0 3010
#define GITCG_ATTR_PLAYER_ALWAYS_OMNI_1 3011
#define GITCG_ATTR_PLAYER_ALLOW_TUNING_ANY_DICE_0 3020
#define GITCG_ATTR_PLAYER_ALLOW_TUNING_ANY_DICE_1 3021
#define GITCG_ATTR_STATE_PHASE 401
#define GITCG_ATTR_STATE_ROUND_NUMBER 402
#define GITCG_ATTR_STATE_CURRENT_TURN 403
#define GITCG_ATTR_STATE_WINNER 404
#define GITCG_ATTR_STATE_PLAYER_DECLARED_END_0 5010
#define GITCG_ATTR_STATE_PLAYER_DECLARED_END_1 5011
#define GITCG_ATTR_STATE_PLAYER_HAS_DEFEATED_0 5020
#define GITCG_ATTR_STATE_PLAYER_HAS_DEFEATED_1 5021
#define GITCG_ATTR_STATE_PLAYER_CAN_CHARGED_0 5030
#define GITCG_ATTR_STATE_PLAYER_CAN_CHARGED_1 5031
#define GITCG_ATTR_STATE_PLAYER_CAN_PLUNGING_0 5040
#define GITCG_ATTR_STATE_PLAYER_CAN_PLUNGING_1 5041
#define GITCG_ATTR_STATE_PLAYER_LEGEND_USED_0 5050
#define GITCG_ATTR_STATE_PLAYER_LEGEND_USED_1 5051
#define GITCG_ATTR_STATE_PLAYER_SKIP_NEXT_TURN_0 5060
#define GITCG_ATTR_STATE_PLAYER_SKIP_NEXT_TURN_1 5061
#define GITCG_ATTR_STATE_PLAYER_DEFEATED_SWITCHING_0 5070
#define GITCG_ATTR_STATE_PLAYER_DEFEATED_SWITCHING_1 5071
#define GITCG_SET_DECK_CHARACTERS 1
#define GITCG_SET_DECK_CARDS 2
#define GITCG_GAME_STATUS_NOT_STARTED 0
#define GITCG_GAME_STATUS_RUNNING 1
#define GITCG_GAME_STATUS_FINISHED 2
#define GITCG_GAME_STATUS_ABORTED 3
#define GITCG_ENTITY_TYPE_CHARACTER 1
#define GITCG_ENTITY_TYPE_EQUIPMENT 2
#define GITCG_ENTITY_TYPE_STATUS 3
#define GITCG_ENTITY_TYPE_COMBAT_STATUS 4
#define GITCG_ENTITY_TYPE_SUMMON 5
#define GITCG_ENTITY_TYPE_SUPPORT 6
#define GITCG_ENTITY_TYPE_EVENT_CARD 7
#define GITCG_ENTITY_TYPE_ATTACHMENT 8
#define GITCG_INTERNAL_IO_RPC 1
#define GITCG_INTERNAL_IO_NOTIFICATION 2
#define GITCG_INTERNAL_IO_ERROR 3
// <<< generated macros

GITCG_API const char* gitcg_version(void);

/**
 * @brief Initialize this library.
 * Should be called before any other functions.
 *
 */
GITCG_API void gitcg_initialize(void);

/**
 * @brief Do cleanup jobs.
 *
 */
GITCG_API void gitcg_cleanup(void);

/**
 * @brief Create a GI-TCG simulation envrionment on this thread.
 * A thread must call this function after `gitcg_initialize` and
 * before any other functions.
 * @return 0 if success, otherwise non-zero
 */
GITCG_API int gitcg_thread_initialize(void);

/**
 * @brief Dispose the GI-TCG simulation environment on this thread.
 */
GITCG_API void gitcg_thread_cleanup(void);

typedef struct gitcg_state_createparam* gitcg_state_createparam_t;

GITCG_API int gitcg_state_createparam_new(gitcg_state_createparam_t* param);
GITCG_API int gitcg_state_createparam_free(gitcg_state_createparam_t param);

GITCG_API int gitcg_state_createparam_set_attr_string(
    gitcg_state_createparam_t param, int key, const char* value);
GITCG_API int gitcg_state_createparam_set_attr_int(
    gitcg_state_createparam_t param, int key, int value);
GITCG_API int gitcg_state_createparam_set_deck(gitcg_state_createparam_t param,
                                               int who, int character_or_card,
                                               const int* deck, int size);

/**
 * @brief A GI-TCG game state.
 *
 */
typedef struct gitcg_state* gitcg_state_t;

GITCG_API int gitcg_state_new(gitcg_state_createparam_t param,
                              gitcg_state_t* state);
GITCG_API int gitcg_state_free(gitcg_state_t state);

/**
 * @brief Create a GI-TCG game state from a JSON string.
 * The JSON string should be exported from `gitcg_state_to_json`.
 *
 * There are no guarantees about the compatibility of the JSON format between
 * different library version.
 *
 * Use `gitcg_state_free` to free the created state.
 * @param env The GI-TCG environment
 * @param json Input JSON string, should be null-terminated.
 * @param state A pointer to `gitcg_state_t` that will be set to the created
 * state
 * @return 0 if success, otherwise non-zero
 */
GITCG_API int gitcg_state_from_json(const char* json, gitcg_state_t* state);

/**
 * @brief Serialize the GI-TCG game state into JSON string.
 *
 * The written JSON string is null-terminated and allocated by `malloc`.
 * It should be freed by `free`.
 *
 * @param state The GI-TCG game state
 * @param json A pointer will be set to the created JSON string
 * @return 0 if success, otherwise non-zero
 */
GITCG_API int gitcg_state_to_json(gitcg_state_t state, char** json);

GITCG_API int gitcg_state_get_attr_int(gitcg_state_t state, int key,
                                       int* value);

/**
 * @brief Get the dice of a player of a game state
 *
 * @param state Give game state
 * @param who whose dice, 0 or 1
 * @param result Points to a space with at least
 * `GITCG_ATTR_STATE_CONFIG_MAX_DICE_COUNT` int.
 * @return Dice count
 */
GITCG_API int gitcg_state_get_dice(gitcg_state_t state, int who, int* result);

typedef struct gitcg_entity* gitcg_entity_t;

GITCG_API int gitcg_entity_free(gitcg_entity_t entity);

/**
 * @brief Execute query (Entity Query Syntax) on the given game state.
 *
 * The result array is allocated by `malloc` and should be freed by `free`.
 *
 * @param state The game state
 * @param who Defines `my` semantics in the query
 * @param query_string
 * @param result A pointer to `gitcg_entity_t*` that will be set to the result
 * array
 * @param result_size A pointer to `size_t` that will be set to the size of the
 * result array
 */
GITCG_API int gitcg_state_query(gitcg_state_t state, int who,
                                const char* query_string,
                                gitcg_entity_t** result, size_t* result_size);

GITCG_API int gitcg_entity_get_id(gitcg_entity_t entity, int* id);
GITCG_API int gitcg_entity_get_definition_id(gitcg_entity_t entity,
                                             int* definition_id);
GITCG_API int gitcg_entity_get_variable(gitcg_entity_t entity,
                                        const char* variable_name, int* result);

typedef struct gitcg_game* gitcg_game_t;
GITCG_API int gitcg_game_new(gitcg_state_t state, gitcg_game_t* game);
GITCG_API int gitcg_game_free(gitcg_game_t game);

typedef void (*gitcg_rpc_handler)(void* player_data, const char* request_data,
                                  size_t request_len, char* response_data,
                                  size_t* response_len);
typedef void (*gitcg_notification_handler)(void* player_data,
                                           const char* notification_data,
                                           size_t notification_len);
typedef void (*gitcg_io_error_handler)(void* player_data,
                                       const char* error_message);

GITCG_API void gitcg_game_set_notification_handler(
    gitcg_game_t game, int who, gitcg_notification_handler handler);
GITCG_API void gitcg_game_set_rpc_handler(gitcg_game_t game, int who,
                                          gitcg_rpc_handler handler);
GITCG_API void gitcg_game_set_io_error_handler(gitcg_game_t game, int who,
                                               gitcg_io_error_handler handler);

GITCG_API void* gitcg_game_set_player_data(gitcg_game_t game, int who,
                                           void* data);

GITCG_API int gitcg_game_set_attr_int(gitcg_game_t game, int key, int value);
GITCG_API int gitcg_game_get_attr_int(gitcg_game_t game, int key, int* value);

/**
 * @brief Step a game instance to next 'pause point'.
 *
 * If an internal error occurred, the status will be set to
 * `GITCG_GAME_STATUS_ABORTED`. Use `gitcg_game_get_error` to get the error
 * message.
 * @param game
 * @return 0 if success. 1 if an internal error occurred during this step.
 */
GITCG_API int gitcg_game_step(gitcg_game_t game);

GITCG_API int gitcg_game_giveup(gitcg_game_t game, int who);

/**
 * @brief Get current game state of a certain game.
 *
 * Use `gitcg_state_free` to free the given state.
 * This state can be passed to `gitcg_game_new` to create a new game,
 * if current game's `gitcg_game_resumable` returns 1.
 * @param game The game instance.
 * @param state A pointer to `gitcg_state_t` that will be set to the current
 * game's state
 * @return 0 if success. 1 if an internal error occurred.
 */
GITCG_API int gitcg_game_get_state(gitcg_game_t game, gitcg_state_t* state);
GITCG_API int gitcg_game_get_status(gitcg_game_t game, int* status);
GITCG_API int gitcg_game_is_resumable(gitcg_game_t game, int* resumable);

/**
 * @brief Get the winner of this game.
 * Winner is determined if and only if the game is at phase "gameEnd".
 * @param game The game instance.
 * @return 0 or 1 if winner is determined. -1 if no winner yet.
 */
GITCG_API int gitcg_game_get_winner(gitcg_game_t game, int* winner);

/**
 * @brief Get the internal error message of this game.
 *
 * Only valid when `gitcg_game_get_status` returns `GITCG_GAME_STATUS_ABORTED`.
 * Otherwise, this function write `NULL` to `error` argument.
 *
 * The written `error` string is null-terminated and allocated by `malloc`.
 * It should be freed by `free`.
 *
 * @param game The game instance
 * @param error A pointer to `char*` that will be set to the error message.
 * @return 0 if success. 1 if no error message.
 */
GITCG_API int gitcg_game_get_error(gitcg_game_t game, char** error);

/**
 * @brief A simple wrapper around libc's `free`.
 * 
 * Useful when the library is dll-opened by another language.
 * 
 * @param ptr The address to free
 */
GITCG_API void gitcg_free_buffer(void* ptr);

// <<< API declarations

/**
 * @brief Free the all entity and list itself that returned by
 * `gitcg_state_query`.
 *
 */
#define gitcg_entity_list_free(list, len) \
  do {                                    \
    for (size_t i = 0; i < len; i++) {    \
      gitcg_entity_free(list[i]);         \
    }                                     \
    free(list);                           \
  } while (0)

#ifdef __cplusplus
}  // extern "C"
#endif

#endif

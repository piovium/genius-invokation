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

#include <stdio.h>

#include <gitcg/gitcg.h>
// #include <gitcg/pb_encode.h>
// #include <gitcg/pb_decode.h>
// #include <gitcg/rpc.pb.h>

int CHARACTER_0[] = {1411, 1510, 2103};
int CHARACTER_1[] = {1609, 2203, 1608};

int CARD_0[] = {214111, 214111, 215101, 311503, 312004, 312004, 312025, 312025,
                312029, 312029, 321002, 321011, 321016, 321016, 322002, 322009,
                322009, 330008, 332002, 332002, 332004, 332004, 332005, 332005,
                332006, 332006, 332018, 332025, 333004, 333004};

int CARD_1[] = {216091, 216091, 222031, 312004, 312004, 312021, 312021, 312025,
                312025, 321002, 321002, 321011, 322025, 323004, 323004, 330005,
                331601, 331601, 332002, 332003, 332003, 332004, 332004, 332005,
                332005, 332006, 332025, 332025, 333003, 333003};

void rpc_handler(void* data, const char* req, size_t req_size, char* res, size_t* res_size) {
  printf("%zu\n", (size_t)data);
  *res_size = 0;
  // Request request = Request_init_default;
  // pb_istream_t input = pb_istream_from_buffer((pb_byte_t*)req, req_size);
  // pb_ostream_t output = pb_ostream_from_buffer((pb_byte_t*)res, *res_size);
  // pb_decode(&input, Request_fields, &request);
  // switch (request.which_request) {
  //   case Request_reroll_dice_tag: {
  //     RerollDiceResponse response = RerollDiceResponse_init_default;
  //     pb_encode(&output, RerollDiceResponse_fields, &response);
  //     *res_size = output.bytes_written;
  //     break;
  //   }
  //   case Request_switch_hands_tag: {
  //     SwitchHandsResponse response = SwitchHandsResponse_init_default;
  //     pb_encode(&output, SwitchHandsResponse_fields, &response);
  //     *res_size = output.bytes_written;
  //     break;
  //   }
  //   case Request_choose_active_tag: {
  //     request.request.choose_active.candidate_ids
  //   }
  // }
}

void io_error_handler(void* data, const char* message) {
  printf("IO error: %s\n", message);
}

int main(int argc, char** argv) {
  gitcg_initialize();
  gitcg_thread_initialize();
  printf("STARTED\n");

  gitcg_state_createparam_t createparam;
  gitcg_state_createparam_new(&createparam);
  gitcg_state_createparam_set_deck(createparam, 0, GITCG_SET_DECK_CHARACTERS,
                                   CHARACTER_0, 3);
  gitcg_state_createparam_set_deck(createparam, 0, GITCG_SET_DECK_CARDS, CARD_0, 30);
  gitcg_state_createparam_set_deck(createparam, 1, GITCG_SET_DECK_CHARACTERS,
                                   CHARACTER_1, 3);
  gitcg_state_createparam_set_deck(createparam, 1, GITCG_SET_DECK_CARDS, CARD_1, 30);

  gitcg_state_t state;
  gitcg_state_new(createparam, &state);
  gitcg_state_createparam_free(createparam);
  
  gitcg_game_t game;
  gitcg_game_new(state, &game);
  gitcg_state_free(state);

  gitcg_game_set_player_data(game, 0, (void*)11111);
  gitcg_game_set_player_data(game, 1, (void*)22222);

  gitcg_game_set_rpc_handler(game, 0, rpc_handler);
  gitcg_game_set_rpc_handler(game, 1, rpc_handler);
  gitcg_game_set_io_error_handler(game, 0, io_error_handler);
  gitcg_game_set_io_error_handler(game, 1, io_error_handler);

  while (1) {
    printf("STEPPING\n");
    gitcg_game_step(game);
    int status = GITCG_GAME_STATUS_NOT_STARTED;
    gitcg_game_get_status(game, &status);
    if (status != GITCG_GAME_STATUS_RUNNING) {
      break;
    }
  }

  gitcg_game_get_state(game, &state);
  char* state_json;
  gitcg_state_to_json(state, &state_json);
  printf("%s\n", state_json);
  free(state_json);

  int round_number;
  gitcg_game_get_attr_int(game, GITCG_ATTR_STATE_ROUND_NUMBER, &round_number);
  printf("round number: %d\n", round_number);

  size_t entity_size;
  gitcg_entity_t* entities;
  gitcg_state_query(state, 0, "(intersection (who my) (type character))",
                    &entities, &entity_size);
  for (size_t i = 0; i < entity_size; ++i) {
    int def_id;
    gitcg_entity_get_definition_id(entities[i], &def_id);
    printf("entity def id: %d\n", def_id);
    int health;
    gitcg_entity_get_variable(entities[i], "health", &health);
    printf("entity health: %d\n", health);
  }
  gitcg_entity_list_free(entities, entity_size);

  gitcg_state_free(state);
  gitcg_game_free(game);

  printf("STOPPED\n");
  gitcg_thread_cleanup();
  gitcg_cleanup();
}

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

#include "game.h"

#include <cstring>
#include <stdexcept>

namespace gitcg {
inline namespace v1_0 {

Game::Game(Environment* environment, int game_id,
           v8::Local<v8::Object> instance)
    : Object{environment, instance}, game_id{game_id} {}

int Game::get_status() const {
  auto isolate = env->get_isolate();
  auto handle_scope = v8::HandleScope(isolate);
  auto status = this->get<v8::Number>("status");
  return status->Value();
}

char* Game::get_error() const {
  auto isolate = env->get_isolate();
  auto handle_scope = v8::HandleScope(isolate);
  auto error = this->get("error");
  if (error->IsNull()) {
    return nullptr;
  }
  auto message = v8::Exception::CreateMessage(isolate, error);
  auto str = v8::String::Utf8Value{isolate, message->Get()};
  auto buffer = static_cast<char*>(std::malloc(str.length() + 1));
  if (buffer == nullptr) {
    throw std::runtime_error("Failed to allocate memory");
  }
  std::memcpy(buffer, *str, str.length());
  buffer[str.length()] = '\0';
  return buffer;
}

bool Game::is_resumable() const {
  auto isolate = env->get_isolate();
  auto handle_scope = v8::HandleScope(isolate);
  auto resumable = this->get<v8::Boolean>("resumable");
  return resumable->Value();
}

State& Game::get_state() {
  auto isolate = env->get_isolate();
  auto handle_scope = v8::HandleScope(isolate);
  auto context = env->get_context();
  auto instance = this->get_instance();
  auto state_obj = this->get<v8::Object>("state");
  auto state_obj_ptr = std::make_unique<State>(env, state_obj);
  return *env->own_object(std::move(state_obj_ptr));
}

int Game::get_winner() const {
  auto isolate = env->get_isolate();
  auto handle_scope = v8::HandleScope(isolate);
  auto winner = this->get<v8::Number>("winner");
  return winner->Value();
}

void Game::set_attribute(int key, int value) {
  auto isolate = env->get_isolate();
  auto handle_scope = v8::HandleScope(isolate);
  auto context = env->get_context();
  auto instance = this->get_instance();
  auto set_attribute_fn = this->get<v8::Function>("setAttribute");
  auto trycatch = v8::TryCatch{isolate};
  v8::Local<v8::Value> args[2]{v8::Number::New(isolate, key),
                               v8::Number::New(isolate, value)};
  auto call_result_maybe = set_attribute_fn->Call(context, instance, 2, args);
  env->check_trycatch(trycatch);
}

int Game::get_attribute(int key) const {
  auto isolate = env->get_isolate();
  auto handle_scope = v8::HandleScope(isolate);
  auto context = env->get_context();
  auto instance = this->get_instance();
  auto get_attribute_fn = this->get<v8::Function>("getAttribute");
  auto trycatch = v8::TryCatch{isolate};
  auto key_value = v8::Number::New(isolate, key).As<v8::Value>();
  auto call_result_maybe = get_attribute_fn->Call(context, instance, 1, &key_value);
  env->check_trycatch(trycatch);
  auto call_result = call_result_maybe.ToLocalChecked().As<v8::Number>();
  return call_result->Value();
}

void Game::step() {
  auto isolate = env->get_isolate();
  auto handle_scope = v8::HandleScope(isolate);
  auto context = env->get_context();
  auto instance = this->get_instance();
  auto test_fn = this->get<v8::Function>("step");
  auto trycatch = v8::TryCatch{isolate};
  auto call_result_maybe = test_fn->Call(context, instance, 0, nullptr);
  env->check_trycatch(trycatch);
  auto call_result = call_result_maybe.ToLocalChecked();
  if (!call_result->IsPromise()) {
    throw std::runtime_error("unreachable: step() should return a Promise");
  }
  auto promise = call_result.As<v8::Promise>();
  switch (promise->State()) {
    case v8::Promise::PromiseState::kFulfilled: {
      return;
    }
    case v8::Promise::PromiseState::kPending: {
      throw std::runtime_error(
          "unreachable: step() returned a promise still pending. A microtask "
          "bug?");
    }
    case v8::Promise::PromiseState::kRejected: {
      auto rejection = promise->Result();
      auto message = v8::Exception::CreateMessage(isolate, rejection);
      auto exception_str = v8::String::Utf8Value{isolate, message->Get()};
      throw std::runtime_error{*exception_str};
    }
  }
}

void Game::giveup(int who) {
  auto isolate = env->get_isolate();
  auto handle_scope = v8::HandleScope(isolate);
  auto context = env->get_context();
  auto instance = this->get_instance();
  auto giveup_fn = this->get<v8::Function>("giveUp");
  auto trycatch = v8::TryCatch{isolate};
  auto who_value = v8::Number::New(isolate, who).As<v8::Value>();
  auto call_result_maybe = giveup_fn->Call(context, instance, 1, &who_value);
  env->check_trycatch(trycatch);
}

}  // namespace v1_0
}  // namespace gitcg

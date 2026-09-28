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

#include "state.h"

#include <cstdlib>
#include <cstring>
#include <stdexcept>

#include "entity.h"

namespace gitcg {
inline namespace v1_0 {

char* State::to_json() const {
  auto isolate = env->get_isolate();
  auto handle_scope = v8::HandleScope(isolate);
  auto context = env->get_context();
  auto instance = this->get_instance();
  auto json_fn = this->get<v8::Function>("toJson");
  auto trycatch = v8::TryCatch{isolate};
  auto json_value_maybe = json_fn->Call(context, instance, 0, nullptr);
  env->check_trycatch(trycatch);
  auto json_value = json_value_maybe.ToLocalChecked();
  auto json_str = v8::String::Utf8Value{isolate, json_value};
  auto size = json_str.length();
  auto buf = static_cast<char*>(std::malloc(size + 1));
  if (buf == nullptr) {
    throw std::runtime_error("Failed to allocate memory");
  }
  std::memcpy(buf, *json_str, size);
  buf[size] = '\0';
  return buf;
}

std::vector<Entity*> State::query(int who, const std::string& query) const {
  auto isolate = env->get_isolate();
  auto handle_scope = v8::HandleScope(isolate);
  auto context = env->get_context();
  auto instance = this->get_instance();
  auto query_fn = this->get<v8::Function>("query");
  auto trycatch = v8::TryCatch{isolate};
  auto query_value_maybe = v8::String::NewFromUtf8(isolate, query.c_str());
  v8::Local<v8::String> query_value;
  if (!query_value_maybe.ToLocal(&query_value)) {
    throw std::runtime_error("Failed to pass query string into v8");
  }
  v8::Local<v8::Value> args[2] {
    v8::Number::New(isolate, who),
    query_value
  };
  auto result_maybe = query_fn->Call(context, instance, 2, args);
  env->check_trycatch(trycatch);
  auto result = result_maybe.ToLocalChecked().As<v8::Array>();
  auto size = result->Length();
  auto entities = std::vector<Entity*>{};
  entities.reserve(size);
  for (std::size_t i = 0; i < size; ++i) {
    auto instance = result->Get(context, i).ToLocalChecked().As<v8::Object>();
    auto entity_obj_ptr = std::make_unique<Entity>(env, instance);
    entities.push_back(env->own_object(std::move(entity_obj_ptr)));
  }
  return entities;
}

int State::get_attribute(int attribute) const {
  auto isolate = env->get_isolate();
  auto handle_scope = v8::HandleScope(isolate);
  auto context = env->get_context();
  auto instance = this->get_instance();
  auto get_attribute_fn = this->get<v8::Function>("getAttribute");
  auto trycatch = v8::TryCatch{isolate};
  auto attribute_value = v8::Number::New(isolate, attribute).As<v8::Value>();
  auto result_maybe =
      get_attribute_fn->Call(context, instance, 1, &attribute_value);
  env->check_trycatch(trycatch);
  auto result = result_maybe.ToLocalChecked().As<v8::Number>();
  return result->Value();
}

std::vector<int> State::get_dice(int who) const {
  auto isolate = env->get_isolate();
  auto handle_scope = v8::HandleScope(isolate);
  auto context = env->get_context();
  auto instance = this->get_instance();
  auto get_attribute_fn = this->get<v8::Function>("getDice");
  auto trycatch = v8::TryCatch{isolate};
  auto who_value = v8::Number::New(isolate, who).As<v8::Value>();
  auto result_maybe = get_attribute_fn->Call(context, instance, 1, &who_value);
  env->check_trycatch(trycatch);
  auto result = result_maybe.ToLocalChecked().As<v8::Array>();
  std::vector<int> dice;
  dice.reserve(result->Length());
  for (std::size_t i = 0; i < result->Length(); ++i) {
    auto dice_value = result->Get(context, i).ToLocalChecked().As<v8::Number>();
    dice.push_back(dice_value->Value());
  }
  return dice;
}

}  // namespace v1_0
}  // namespace gitcg

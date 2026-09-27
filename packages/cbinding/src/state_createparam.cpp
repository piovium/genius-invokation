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

#include "state_createparam.h"

#include <stdexcept>

namespace gitcg {
inline namespace v1_0 {

void StateCreateParam::set_attribute(int attribute, int value) {
  auto isolate = env->get_isolate();
  auto handle_scope = v8::HandleScope(isolate);
  auto v8_value = v8::Number::New(isolate, value);
  set_attribute(attribute, v8_value);
}

void StateCreateParam::set_attribute(int attribute, const std::string& value) {
  auto isolate = env->get_isolate();
  auto handle_scope = v8::HandleScope(isolate);
  auto value_maybe = v8::String::NewFromUtf8(isolate, value.c_str());
  v8::Local<v8::String> v8_value;
  if (!value_maybe.ToLocal(&v8_value)) {
    throw std::runtime_error("Failed to pass string into v8");
  }
  set_attribute(attribute, v8_value);
}

void StateCreateParam::set_attribute(int attribute,
                                     v8::Local<v8::Value> value) {
  auto isolate = env->get_isolate();
  auto handle_scope = v8::HandleScope(isolate);
  auto context = env->get_context();
  auto instance = this->instance.Get(isolate);
  auto trycatch = v8::TryCatch{isolate};
  auto set_attribute_fn = this->get<v8::Function>("setAttribute");
  v8::Local<v8::Value> args[2]{v8::Number::New(isolate, attribute), value};
  auto ret = set_attribute_fn->Call(context, instance, 2, args);
  env->check_trycatch(trycatch);
}

void StateCreateParam::set_deck(int who, int character_or_card, const int* deck,
                                int size) {
  auto isolate = env->get_isolate();
  auto handle_scope = v8::HandleScope(isolate);
  auto context = env->get_context();
  auto instance = this->instance.Get(isolate);
  auto trycatch = v8::TryCatch{isolate};
  auto set_deck_fn = this->get<v8::Function>("setDeck");
  auto deck_array = v8::Array::New(isolate, size);
  for (int i = 0; i < size; ++i) {
    deck_array->Set(context, i, v8::Number::New(isolate, deck[i])).Check();
  }
  v8::Local<v8::Value> args[3]{v8::Number::New(isolate, who),
                               v8::Number::New(isolate, character_or_card),
                               deck_array};
  auto ret = set_deck_fn->Call(context, instance, 3, args);
  env->check_trycatch(trycatch);
}

}  // namespace v1_0
}  // namespace gitcg

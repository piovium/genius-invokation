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

#include "entity.h"

#include <stdexcept>

namespace gitcg {
inline namespace v1_0 {

int Entity::get_variable(const std::string& name) const {
  auto isolate = env->get_isolate();
  auto handle_scope = v8::HandleScope{isolate};
  auto context = env->get_context();
  auto instance = this->get_instance();
  auto get_variable_fn = this->get<v8::Function>("getVariable");
  auto name_value_maybe = v8::String::NewFromUtf8(isolate, name.c_str());
  v8::Local<v8::Value> name_value;
  if (!name_value_maybe.ToLocal(&name_value)) {
    throw std::runtime_error("Failed to pass variable name into v8");
  }
  auto trycatch = v8::TryCatch{isolate};
  auto result = get_variable_fn->Call(context, instance, 1, &name_value);
  env->check_trycatch(trycatch);
  return result.ToLocalChecked().As<v8::Number>()->Value();
}

}  // namespace v1_0
}  // namespace gitcg

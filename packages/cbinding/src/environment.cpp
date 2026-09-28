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

#include "environment.h"

#include <cstring>
#include <stdexcept>

#include "entity.h"
#include "game.h"
#include "state.h"
#include "state_createparam.h"

namespace gitcg {
inline namespace v1_0 {

void initialize() {
  // v8::V8::InitializeICUDefaultLocation(argv[0]);
  // v8::V8::InitializeExternalStartupData(argv[0]);
  // v8::V8::SetFlagsFromString("--max-old-space-size=64");
  static auto platform = v8::platform::NewDefaultPlatform();
  v8::V8::InitializePlatform(platform.get());
  v8::V8::Initialize();
}

void cleanup() {
  v8::V8::Dispose();
  v8::V8::DisposePlatform();
}

namespace {

thread_local std::unique_ptr<Environment> instance;

constexpr int ENVIRONMENT_THIS_SLOT = 1;
constexpr std::size_t MAX_RESPONSE_SIZE = 128;

constexpr v8::FunctionCallback io_fn_callback =
    [](const v8::FunctionCallbackInfo<v8::Value>& args) {
      auto isolate = args.GetIsolate();
      auto context = isolate->GetCurrentContext();
      auto data = context->GetEmbedderData(ENVIRONMENT_THIS_SLOT);
      auto environment = static_cast<Environment*>(
          data.As<v8::External>()->Value(v8::kExternalPointerTypeTagDefault));
      auto gameId = args[0].As<v8::Number>()->Value();
      int ioType = args[1].As<v8::Number>()->Value();
      auto who = args[2].As<v8::Number>()->Value();
      auto request = args[3].As<v8::Uint8Array>()->Buffer();
      auto buf_len = request->ByteLength();
      auto buf_data = static_cast<char*>(request->Data());
      auto game = environment->get_game(gameId);
      if (!game) {
        auto error_message =
            v8::String::NewFromUtf8Literal(isolate, "Game not found");
        isolate->ThrowError(error_message);
        return;
      }
      auto player_data = game->get_player_data(who);
      switch (ioType) {
        case GITCG_INTERNAL_IO_RPC: {
          auto handler = game->get_rpc_handler(who);
          if (!handler) {
            auto error_message =
                v8::String::NewFromUtf8Literal(isolate, "RPC handler not set");
            isolate->ThrowError(error_message);
            return;
          }
          auto response_buf = v8::ArrayBuffer::New(isolate, MAX_RESPONSE_SIZE);

          auto response_len = MAX_RESPONSE_SIZE;
          handler(player_data, buf_data, buf_len,
                  static_cast<char*>(response_buf->Data()), &response_len);
          if (response_len > MAX_RESPONSE_SIZE) {
            auto error_message =
                v8::String::NewFromUtf8Literal(isolate, "Response too large");
            isolate->ThrowError(error_message);
            return;
          }
          auto response_array =
              v8::Uint8Array::New(response_buf, 0, response_len);
          args.GetReturnValue().Set(response_array);
          break;
        }
        case GITCG_INTERNAL_IO_NOTIFICATION: {
          auto handler = game->get_notification_handler(who);
          if (!handler) {
            auto error_message = v8::String::NewFromUtf8Literal(
                isolate, "Notification handler not set");
            isolate->ThrowError(error_message);
            return;
          }
          handler(player_data, buf_data, buf_len);
          break;
        }
        case GITCG_INTERNAL_IO_ERROR: {
          auto handler = game->get_io_error_handler(who);
          if (handler) {
            auto buf_data_copy =
                std::make_unique_for_overwrite<char[]>(buf_len + 1);
            std::memcpy(buf_data_copy.get(), buf_data, buf_len);
            buf_data_copy[buf_len] = '\0';
            handler(player_data, buf_data_copy.get());
          }
          break;
        }
      }
    };

constexpr v8::Module::SyntheticModuleEvaluationSteps io_module_eval_callback =
    [](v8::Local<v8::Context> context,
       v8::Local<v8::Module> module) -> v8::MaybeLocal<v8::Value> {
  auto isolate = v8::Isolate::GetCurrent();
  auto io_str = v8::String::NewFromUtf8Literal(isolate, "io");
  auto io_fn = v8::FunctionTemplate::New(isolate, io_fn_callback);
  auto io_fn_instance = io_fn->GetFunction(context).ToLocalChecked();
  module->SetSyntheticModuleExport(isolate, io_str, io_fn_instance).FromJust();

  auto undefined = v8::Undefined(isolate);
  auto promise_resolver = v8::Promise::Resolver::New(context).ToLocalChecked();
  promise_resolver->Resolve(context, undefined).FromJust();
  return promise_resolver->GetPromise();
};

constexpr v8::Module::ResolveModuleCallback resolve_module_callback =
    [](v8::Local<v8::Context> context, v8::Local<v8::String> specifier,
       v8::Local<v8::FixedArray> import_attributes,
       v8::Local<v8::Module> referrer) -> v8::MaybeLocal<v8::Module> {
  auto isolate = v8::Isolate::GetCurrent();
  auto expected_specifier =
      v8::String::NewFromUtf8Literal(isolate, "@gi-tcg/cbinding-io");
  if (!specifier->StringEquals(expected_specifier)) {
    auto error_message =
        v8::String::NewFromUtf8Literal(isolate, "Module not found");
    isolate->ThrowError(error_message);
    return v8::MaybeLocal<v8::Module>{};
  }
  std::vector<v8::Local<v8::String>> export_names = {
      v8::String::NewFromUtf8Literal(isolate, "io")};
  auto io_module = v8::Module::CreateSyntheticModule(
      isolate, specifier, {export_names.data(), export_names.size()},
      io_module_eval_callback);
  return io_module;
};
}  // namespace

void Environment::check_trycatch(v8::TryCatch& trycatch) {
  if (trycatch.HasCaught()) [[unlikely]] {
    auto exception = trycatch.Exception();
    auto message = v8::Exception::CreateMessage(isolate, exception);
    auto exception_str = v8::String::Utf8Value{isolate, message->Get()};
    throw std::runtime_error{*exception_str};
  }
}

void Environment::check_promise(v8::Local<v8::Promise> promise) {
  switch (promise->State()) {
    case v8::Promise::PromiseState::kFulfilled: {
      return;
    }
    case v8::Promise::PromiseState::kPending: {
      throw std::runtime_error(
          "unreachable: Promise still pending. A microtask bug?");
    }
    case v8::Promise::PromiseState::kRejected: {
      auto rejection = promise->Result();
      auto message = v8::Exception::CreateMessage(isolate, rejection);
      auto exception_str = v8::String::Utf8Value{isolate, message->Get()};
      throw std::runtime_error{*exception_str};
    }
  }
}

Environment::Environment() {
  create_params.constraints.set_max_old_generation_size_in_bytes(1 << 27);
  create_params.array_buffer_allocator =
      v8::ArrayBuffer::Allocator::NewDefaultAllocator();
  isolate = v8::Isolate::New(create_params);
  isolate->Enter();

  auto handle_scope = v8::HandleScope(isolate);
  auto context = v8::Context::New(isolate);
  this->context.Reset(isolate, context);
  context->Enter();
  context->SetEmbedderData(
      ENVIRONMENT_THIS_SLOT,
      v8::External::New(isolate, this, v8::kExternalPointerTypeTagDefault));

  v8::Local<v8::String> source_string =
      v8::String::NewFromUtf8(isolate, JS_CODE).ToLocalChecked();
  v8::Local<v8::String> resource_name =
      v8::String::NewFromUtf8Literal(isolate, "main.js");
  v8::ScriptOrigin origin(resource_name, 0, 0, false, -1,
                          v8::Local<v8::Value>{}, false, false, true);
  v8::ScriptCompiler::Source source(source_string, origin);
  auto main_module =
      v8::ScriptCompiler::CompileModule(isolate, &source).ToLocalChecked();
  main_module->InstantiateModule(context, resolve_module_callback).FromJust();
  auto ret = main_module->Evaluate(context).ToLocalChecked();
  check_promise(ret.As<v8::Promise>());

  auto ns = main_module->GetModuleNamespace().As<v8::Object>();
  auto game_ctor = ns->Get(context, v8_string("Game")).ToLocalChecked();
  this->game_ctor.Reset(isolate, game_ctor.As<v8::Function>());
}

Environment::~Environment() {
  owning_objects.clear();
  context.Reset();
  isolate->Exit();
  isolate->Dispose();
  delete create_params.array_buffer_allocator;
}

Environment& Environment::create() {
  if (instance) {
    throw std::runtime_error("Context instance already exists on this thread");
  }
  instance = std::make_unique<Environment>();
  return *instance;
}

Environment& Environment::get_instance() {
  if (!instance) {
    throw std::runtime_error("Context instance does not exist on this thread");
  }
  return *instance;
}

void Environment::dispose() {
  // auto& _ = get_instance();
  instance.reset();
}

Game& Environment::new_game(const State& state) {
  auto handle_scope = v8::HandleScope(isolate);
  auto context = get_context();
  auto game_ctor = this->game_ctor.Get(isolate);
  auto game_id = next_game_id++;
  auto game_id_value = v8::Number::New(isolate, game_id);
  v8::Local<v8::Value> game_ctor_args[2]{game_id_value, state.get_instance()};
  auto game_instance =
      game_ctor->NewInstance(context, 2, game_ctor_args).ToLocalChecked();
  auto game = std::make_unique<Game>(this, game_id, game_instance);
  auto game_ptr = game.get();
  games.emplace(game_id, game_ptr);
  return *own_object(std::move(game));
}

Game* Environment::get_game(int gameId) noexcept {
  auto it = games.find(gameId);
  if (it == games.end()) {
    return nullptr;
  }
  return it->second;
}

StateCreateParam& Environment::new_state_createparam() {
  auto handle_scope = v8::HandleScope(isolate);
  auto context = get_context();
  auto game_ctor = this->game_ctor.Get(isolate);
  auto create_param_str = v8_string("CreateParameter");
  auto create_param_ctor = game_ctor->Get(context, create_param_str)
                               .ToLocalChecked()
                               .As<v8::Function>();
  auto create_param_instance =
      create_param_ctor->NewInstance(context, 0, nullptr).ToLocalChecked();
  auto create_param_ptr =
      std::make_unique<StateCreateParam>(this, create_param_instance);
  return *own_object(std::move(create_param_ptr));
}

State& Environment::state_from_createparam(const StateCreateParam& param) {
  auto handle_scope = v8::HandleScope(isolate);
  auto context = get_context();
  auto param_instance = param.get_instance();
  auto trycatch = v8::TryCatch{isolate};
  auto create_state_str = v8_string("createState");
  auto create_state_fn = param_instance->Get(context, create_state_str)
                             .ToLocalChecked()
                             .As<v8::Function>();
  auto result = create_state_fn->Call(context, param_instance, 0, nullptr);
  check_trycatch(trycatch);
  auto state_ptr =
      std::make_unique<State>(this, result.ToLocalChecked().As<v8::Object>());
  return *own_object(std::move(state_ptr));
}

State& Environment::state_from_json(const char* json) {
  auto handle_scope = v8::HandleScope(isolate);
  auto context = get_context();
  auto from_json_str = v8_string("stateFromJson");
  auto game_ctor = this->game_ctor.Get(isolate);
  auto from_json_fn = game_ctor->Get(context, from_json_str)
                          .ToLocalChecked()
                          .As<v8::Function>();
  auto trycatch = v8::TryCatch{isolate};
  auto json_str_maybe = v8::String::NewFromUtf8(isolate, json);
  v8::Local<v8::String> json_str;
  if (!json_str_maybe.ToLocal(&json_str)) {
    throw std::runtime_error("Failed to pass JSON string into v8");
  }
  auto undefined = v8::Undefined(isolate);
  v8::Local<v8::Value> args[1]{json_str};
  auto result = from_json_fn->Call(context, undefined, 1, args);
  check_trycatch(trycatch);
  auto state_ptr =
      std::make_unique<State>(this, result.ToLocalChecked().As<v8::Object>());
  return *own_object(std::move(state_ptr));
}

void Environment::free_object(Object* object) {
  auto it = owning_objects.find(object);
  if (it != owning_objects.end()) {
    owning_objects.erase(it);
  }
}

}  // namespace v1_0
}  // namespace gitcg

cmake_minimum_required(VERSION 3.25)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

### Fetch and configure v8-cmake

include(FetchContent)
FetchContent_Declare(
  v8-cmake
  GIT_REPOSITORY https://github.com/piovium/v8-cmake-barbara.git
  GIT_TAG        ee9857bfca130149314326efd12ac647e3f7d1b7
)
FetchContent_MakeAvailable(v8-cmake)

project(gitcg-cbinding)

add_library(gitcg
  SHARED
  src/environment.cpp
  src/object.cpp
  src/state_createparam.cpp
  src/state.cpp
  src/entity.cpp
  src/game.cpp
  src/api.cpp
  generated/js_code.cpp)

set_target_properties(gitcg
  PROPERTIES
  CXX_STANDARD 20
  CXX_STANDARD_REQUIRED ON
)

target_compile_definitions(gitcg PRIVATE -DGITCG_API_EXPORTS)

target_compile_options(gitcg PRIVATE "$<$<CXX_COMPILER_ID:MSVC>:/utf-8>")

target_link_libraries(gitcg PRIVATE v8::v8)

target_sources(gitcg PUBLIC
  FILE_SET gitcg_headers
    TYPE HEADERS
    BASE_DIRS include
    FILES include/gitcg/gitcg.h
)

install(TARGETS gitcg
  FILE_SET gitcg_headers)

add_executable(gitcg-cbinding-test
  test/main.c
)

target_link_libraries(gitcg-cbinding-test
  PRIVATE
  gitcg
)

enable_testing()
add_test(NAME gitcg-cbinding-test COMMAND gitcg-cbinding-test)

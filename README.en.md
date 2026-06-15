# Genius Invokation TCG Simulator

[中文版](./README.md)  | [English Version](./README.en.md) | [日本語版](./README.jp.md)

Sample deployments are available at following links:
https://standalone.piovium.org


## Features of This Project

- Fully open source (main body uses AGPLv3.0 or later)
- The core implementations try to be the closest to the official rules
- Full card definitions as of ![Version of Genshin Impact](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fplay.piovium.org%2Fapi%2Fversion&query=%24.currentGameVersion&label=Genshin%20Impact)
  - Definition format is concise and easy to read
  - Easy maintenance
- Definition of all old version cards (before balance adjustments)
  - Supports self-selected game version to start the game
- Front-end Features：
  - Game visualization and local simulation
  - Historical retrospective (replay) and mid-game continuation
  - Game import and export
  - View detailed settlement logs
- [Battle Platform](https://play.piovium.org) (In public beta)
- Cross Programming Language Support
  - [C/C++](./packages/cbinding/)
  - [Python](./packages/pybinding/)
  - [C#](./packages/csbinding/)
  - Coming Soon...
- ~Sneak peeks at the beta cards~
- Currently **there are still a lot of bugs**, need more testing

## [About Development](./docs/development/README.md)

The above link provides access to (possibly outdated) development documentation and notes.


If you are interested in our project or want to have more infomation, welcome to join our [Discord server](https://discord.gg/vGjh6XAKqk).

All English content should refer to the Chinese content.



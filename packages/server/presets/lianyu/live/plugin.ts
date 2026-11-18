// Copyright (C) 2026 Piovium Labs
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

export default function plugin() {
  return {
    $schema_version: 1 as const,
    version_maps: [
      {
        25044: "v7.1.0",
        331012: "v7.1.0",
      },
    ],
  };
}

// 更新后预计引入的：
// mods: 321020 赤王陵
// versions:
// - "1113": "latest",
// - "11132": "v5.2.0",
// - "111132": "v5.2.0",
// - "1217": "v7.2.0",
// - "1517": "v7.2.0",
// - "322035": "v7.2.0",
// - "330015": "v7.2.0",
// - "332044": "v7.2.0"

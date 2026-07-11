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

const subIdPool = new Map<number, number>();

export function getSubId(mainId: number): number {
  if (typeof mainId !== "number") {
    throw new Error(`Invalid main ID: ${mainId}`);
  }
  let counterValue = subIdPool.get(mainId) ?? 0;
  subIdPool.set(mainId, ++counterValue);
  if (counterValue >= 100) {
    throw new Error(`Sub ID counter for ${mainId} exceeded 100`);
  }
  return mainId + 0.01 * counterValue;
}
export function resetSubId(): void {
  subIdPool.clear();
}

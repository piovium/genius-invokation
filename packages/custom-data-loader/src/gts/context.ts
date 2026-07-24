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

import { GiTcgDataError } from "@gi-tcg/core";

export interface CustomDataMetadata {
  id: number;
  name: string;
  description: string;
  image: string;
}

export interface CustomDataRegistration {
  allocateId(node: object): number;
  registerMetadata(metadata: CustomDataMetadata): void;
}

let currentRegistration: CustomDataRegistration | null = null;

export function getCustomDataRegistration(): CustomDataRegistration {
  if (currentRegistration === null) {
    throw new GiTcgDataError("Not in custom data registration");
  }
  return currentRegistration;
}

export function beginCustomDataRegistration(
  registration: CustomDataRegistration,
): () => void {
  if (currentRegistration !== null) {
    throw new GiTcgDataError("Already in custom data registration");
  }
  currentRegistration = registration;
  return () => {
    if (currentRegistration !== registration) {
      throw new GiTcgDataError("Not in this custom data registration");
    }
    currentRegistration = null;
  };
}

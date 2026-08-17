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
import { getCurrentView, type View } from "./runtime";

export class CustomMetadata {
  customName: string | null = null;
  customDescription: string | null = null;
  customImage: string | null = null;

  #specifiedId: number | null = null;
  #allocatedId: number | null = null;

  private constructor() {}
  static metadataRegistry = new WeakMap<View<any>, CustomMetadata>();
  static create(): CustomMetadata {
    const view = getCurrentView();
    if (!view) {
      throw new Error(
        `Please call CustomMetadata.create() inside GTS Model construction.`,
      );
    }
    let metadata = this.metadataRegistry.get(view);
    if (!metadata) {
      metadata = new CustomMetadata();
      this.metadataRegistry.set(view, metadata);
    }
    return metadata;
  }

  specifyId(id: number) {
    if (this.#specifiedId !== null) {
      throw new Error(
        `Definition #${this.#specifiedId} already specified an ID`,
      );
    }
    this.#specifiedId = id;
  }

  #allocateId() {
    if (this.#specifiedId !== null) {
      throw new Error(
        `Definition #${this.#specifiedId} already specified an ID`,
      );
    }
    const registration = getCustomDataRegistration();
    return (this.#allocatedId = registration.allocateId(this));
  }

  get id(): number {
    return this.#specifiedId ?? this.#allocatedId ?? this.#allocateId();
  }
}
export interface CustomDataRegistration {
  allocateId(node: object): number;
  registerMetadata(metadata: CustomMetadata): void;
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

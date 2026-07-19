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

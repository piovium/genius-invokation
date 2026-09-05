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

import {
  type Binding,
  type EntityDefinition,
  getInlineIds,
  getReferencedNames,
  TcgDataSourceFile,
} from "./source_file";

export class TcgDataProject {
  readonly files = new Map<string, TcgDataSourceFile>();

  addFile(file: TcgDataSourceFile) {
    this.files.set(file.filepath, file);
  }

  getDependencies(
    file: TcgDataSourceFile,
    definition: EntityDefinition,
  ): Set<number> {
    const dependencies = getInlineIds(definition.node);
    for (const name of getReferencedNames(definition.node)) {
      for (const dependency of this.resolveName(file, name, new Set())) {
        dependencies.add(dependency.id);
      }
    }
    dependencies.delete(definition.id);
    return dependencies;
  }

  private resolveName(
    file: TcgDataSourceFile,
    name: string,
    from: Set<Binding>,
  ): Set<EntityDefinition> {
    const resolved = this.getBinding(file, name);
    return resolved
      ? this.resolveBinding(resolved.file, resolved.binding, from)
      : new Set();
  }

  private getBinding(
    file: TcgDataSourceFile,
    name: string,
  ): { file: TcgDataSourceFile; binding: Binding } | null {
    const localBinding = file.getBinding(name);
    if (localBinding) {
      return { file, binding: localBinding };
    }

    const importBinding = file.imports.get(name);
    if (!importBinding) {
      return null;
    }
    const importedFile = this.files.get(importBinding.filename);
    const importedBinding = importedFile?.getBinding(
      importBinding.importedName,
      true,
    );
    return importedFile && importedBinding
      ? { file: importedFile, binding: importedBinding }
      : null;
  }

  private resolveBinding(
    file: TcgDataSourceFile,
    binding: Binding,
    from: Set<Binding>,
  ): Set<EntityDefinition> {
    if (binding.kind === "entity") {
      return new Set([binding.entity]);
    }
    if (from.has(binding)) {
      return new Set();
    }

    const nextFrom = new Set(from).add(binding);
    const result = new Set<EntityDefinition>();
    for (const name of getReferencedNames(binding.initializer)) {
      for (const dependency of this.resolveName(file, name, nextFrom)) {
        result.add(dependency);
      }
    }
    return result;
  }
}

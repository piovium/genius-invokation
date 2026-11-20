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

import { Errored, Loading, type ParentProps } from "solid-js";
import type { JSX } from "@solidjs/web";

export function AssetFallback(
  props: ParentProps<{ fallback?: JSX.Element; on?: unknown }>,
) {
  return (
    <Errored fallback={props.fallback ?? null}>
      <Loading on={props.on} fallback={props.fallback}>
        {props.children}
      </Loading>
    </Errored>
  );
}

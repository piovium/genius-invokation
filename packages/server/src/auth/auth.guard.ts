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
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import type { AuthService } from "./auth.service";
import { isUserJwtPayload } from "./user.decorator";
import { unauthorized } from "../errors";

export function requestIdentity(request: Request, auth: AuthService) {
  const authorization = request.headers.get("authorization");
  const parts = authorization?.split(" ");
  return parts?.length === 2 && parts[0] === "Bearer"
    ? auth.verify(parts[1]!)
    : null;
}

export function requireUser(request: Request, auth: AuthService) {
  const payload = requestIdentity(request, auth);
  if (!isUserJwtPayload(payload)) throw unauthorized();
  return payload.sub;
}

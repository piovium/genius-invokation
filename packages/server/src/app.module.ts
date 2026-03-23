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

import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AuthModule } from './auth/auth.module';
import { UsersModule } from "./users/users.module";
import { GamesModule } from './games/games.module';
import { DecksModule } from './decks/decks.module';
import { RoomsModule } from './rooms/rooms.module';
import { MetricsModule } from "./metrics/metrics.module";

@Module({
  controllers: [AppController],
  imports: [
    AuthModule,
    UsersModule,
    GamesModule,
    DecksModule,
    RoomsModule,
    MetricsModule,
  ],
})
export class AppModule {}

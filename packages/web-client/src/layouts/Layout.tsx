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

import { ErrorBoundary, JSX } from "solid-js";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Dynamic } from "solid-js/web";

export interface LayoutProps {
  children?: JSX.Element;
}

function Passthrough(props: { children?: JSX.Element }) {
  return <>{props.children}</>;
}

export function Layout(props: LayoutProps) {
  return (
    <div class="w-full h-full flex flex-col justify-between">
      <Header />
      <main class="flex-grow flex-shrink-0 min-h-0 w-full p-4 md:p-8 md:pb-0 mt-12 md:mt-16 md:max-h-[calc(100vh-8.5rem)]">
        <Dynamic
          component={import.meta.env.DEV ? Passthrough : ErrorBoundary}
          fallback={(err: Error) => (
            <div class="text-red-500">{err?.message ?? String(err)}</div>
          )}
        >
          {props.children}
        </Dynamic>
      </main>

      <Footer />
    </div>
  );
}

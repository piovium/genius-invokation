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

export interface LayoutProps {
  children?: JSX.Element;
}

export function Layout(props: LayoutProps) {
  return (
    <div class="w-full h-full flex flex-col">
      <Header />
      <main
        class="flex-grow flex-shrink-0 min-h-0 w-full p-4 md:p-8 mt-12 md:mt-16"
      >
        <ErrorBoundary
          fallback={(err) => (
            <div class="text-red-500">{err?.message ?? String(err)}</div>
          )}
        >
          {props.children}
        </ErrorBoundary>
      </main>

      <Footer />
    </div>
  );
}

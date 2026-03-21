/* @refresh reload */

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

import { render } from "solid-js/web";
import { I18nProvider } from "./i18n";

import "./style.css";
import "virtual:uno.css";
import "@una-ui/preset/una.css";
import "@unocss/reset/tailwind-compat.css";

import axios from "axios";
import { BACKEND_BASE_URL } from "./config";

async function prepareServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
    scope: import.meta.env.BASE_URL,
  });
  navigator.serviceWorker.ready.then((sw) => {
    sw.active?.postMessage({
      type: "config",
      payload: {
        backendBaseUrl: BACKEND_BASE_URL,
      }
    });
  });
}

async function main() {
  await prepareServiceWorker();
  if (import.meta.env.PROD) {
    await import("core-js");
  }
  axios.defaults.baseURL = BACKEND_BASE_URL;
  axios.interceptors.request.use((config) => {
    if (config.url?.includes("https://")) {
      // non-backend request
      return config;
    }
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  });

  const app = document.getElementById("app")!;
  const { default: App } = await import("./App");
  render(
    () => (
      <I18nProvider>
        <App />
      </I18nProvider>
    ),
    app,
  );
}

main();

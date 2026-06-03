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
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { createSignal, onCleanup, onMount, For } from "solid-js";
import { Layout } from "../layouts/Layout";

interface FontInfoRow {
  key: string;
  value: string;
  note: string;
}

function isWeChat(): boolean {
  return /MicroMessenger/i.test(navigator.userAgent);
}

function hasWeixinJSBridge(): boolean {
  return typeof (window as any).WeixinJSBridge !== "undefined";
}

function readAllFontProps(): FontInfoRow[] {
  const html = document.documentElement;
  const body = document.body;
  const htmlStyle = getComputedStyle(html);
  const bodyStyle = body ? getComputedStyle(body) : null;
  const vv = window.visualViewport;

  const rows: FontInfoRow[] = [];

  // --- html element ---
  rows.push({
    key: "html.computed.fontSize",
    value: htmlStyle.fontSize,
    note: "documentElement getComputedStyle fontSize",
  });
  rows.push({
    key: "html.computed.webkit",
    value: htmlStyle.getPropertyValue("-webkit-text-size-adjust"),
    note: "控制WebKit文字自动缩放",
  });
  rows.push({
    key: "html.inline.fontSize",
    value: html.style.fontSize || "(未设置)",
    note: "documentElement inline style fontSize",
  });

  // --- body element ---
  if (bodyStyle) {
    rows.push({
      key: "body.computed.fontSize",
      value: bodyStyle.fontSize,
      note: "body getComputedStyle fontSize",
    });
    rows.push({
      key: "body.computed.webkit",
      value: bodyStyle.getPropertyValue("-webkit-text-size-adjust"),
      note: "body WebKit文字缩放",
    });
    rows.push({
      key: "body.inline.fontSize",
      value: body.style.fontSize || "(未设置)",
      note: "body inline style fontSize",
    });
  }

  // --- test elements: px vs rem ---
  const testEl = document.getElementById("gi-font-debug-test");
  if (testEl) {
    const testStyle = getComputedStyle(testEl);
    rows.push({
      key: "width=4rem computed",
      value: testStyle.width,
      note: "内部div w-16 (=4rem) 的 computed width",
    });
    rows.push({
      key: "width=64px computed",
      value: testStyle.height,
      note: "内部另一div w-16 (=64px) 的 computed height (用作width)",
    });
    const pxChild = testEl.querySelector('[data-unit="px"]');
    const remChild = testEl.querySelector('[data-unit="rem"]');
    if (pxChild) {
      rows.push({
        key: "width=64px client",
        value: `${pxChild.clientWidth}px`,
        note: "clientWidth of 64px div",
      });
    }
    if (remChild) {
      rows.push({
        key: "width=4rem client",
        value: `${remChild.clientWidth}px`,
        note: "clientWidth of 4rem div",
      });
    }
  }

  // --- viewport / screen ---
  rows.push({
    key: "devicePixelRatio",
    value: String(window.devicePixelRatio),
    note: "window.devicePixelRatio",
  });
  if (vv) {
    rows.push({
      key: "visualViewport.scale",
      value: String(vv.scale),
      note: "visualViewport.scale (pinch zoom)",
    });
    rows.push({
      key: "viewport.aspectRatio",
      value: `${Math.round(vv.width)}px × ${Math.round(vv.height)}px`,
      note: "",
    });
  }
  rows.push({
    key: "screen.aspectRatio",
    value: `${screen.width} × ${screen.height}`,
    note: "",
  });
  rows.push({
    key: "window.aspectRatio",
    value: `${window.innerWidth} × ${window.innerHeight}`,
    note: "",
  });

  // --- env ---
  rows.push({
    key: "WeixinJSBridge",
    value: hasWeixinJSBridge() ? "存在" : "undefined",
    note: "",
  });  
  rows.push({
    key: "User-Agent (WeChat?)",
    value: isWeChat() ? "⚠️ 微信浏览器 (MicroMessenger)" : navigator.userAgent,
    note: "",
  });

  return rows;
}

export default function FontDebug() {
  const [rows, setRows] = createSignal<FontInfoRow[]>([]);

  let timer: ReturnType<typeof setInterval>;

  const refresh = () => setRows(readAllFontProps());

  onMount(() => {
    refresh();
    timer = setInterval(refresh, 500);

    // 监听 documentElement style 属性变化
    const mo = new MutationObserver(() => refresh());
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
    if (document.body) {
      mo.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    }

    onCleanup(() => {
      clearInterval(timer);
      mo.disconnect();
    });
  });

  return (
    <Layout>
      <div class="h-full overflow-auto">
        {/* 隐藏的测试元素，用于测量 px vs rem 差异 */}
        <div
          id="gi-font-debug-test"
          style={{
            position: "absolute",
            visibility: "hidden",
            width: "4rem",
            height: "64px",
          }}
        >
          <div data-unit="px" style={{ width: "64px", height: "1px" }} />
          <div data-unit="rem" style={{ width: "4rem", height: "1px" }} />
        </div>

        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="text-left">
              <th class="border border-gray-400 p-2 bg-gray-100 w-1/3">
                属性
              </th>
              <th class="border border-gray-400 p-2 bg-gray-100">值</th>
              {/* <th class="border border-gray-400 p-2 bg-gray-100">备注</th> */}
            </tr>
          </thead>
          <tbody>
            <For each={rows()}>
              {(row) => (
                <tr>
                  <td class="border border-gray-300 p-2 font-mono text-xs align-top">
                    {row.key}
                  </td>
                  <td class="border border-gray-300 p-2 font-mono text-xs font-bold align-top">
                    {row.value}
                  </td>
                  {/* <td class="border border-gray-300 p-2 text-xs text-gray-500 align-top">
                    {row.note}
                  </td> */}
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

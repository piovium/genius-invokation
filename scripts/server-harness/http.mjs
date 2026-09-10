import assert from "node:assert/strict";

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Keep credentials and response bodies out of diagnostics/reports.
export function createApi(baseUrl, timeoutMs = 10000) {
  return async (path, { method = "GET", body, token, status = [200, 201, 204] } = {}) => {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "error",
    });
    assert.ok(status.includes(response.status), `${method} ${path}: HTTP ${response.status}, expected ${status.join("/")}`);
    let text = "";
    const decoder = new TextDecoder("utf-8", { fatal: true });
    for await (const chunk of response.body ?? []) {
      text += decoder.decode(chunk, { stream: true });
      assert.ok(text.length <= 32 * 1024 * 1024, `${path}: response exceeds 32 MiB`);
    }
    text += decoder.decode();
    return { status: response.status, data: text ? JSON.parse(text) : null };
  };
}

export async function waitUntil(check, timeoutMs, description, intervalMs = 100) {
  const deadline = Date.now() + timeoutMs;
  do {
    const result = await check();
    if (result) return result;
    await delay(Math.min(intervalMs, Math.max(0, deadline - Date.now())));
  } while (Date.now() < deadline);
  throw new Error(`Timed out: ${description}`);
}

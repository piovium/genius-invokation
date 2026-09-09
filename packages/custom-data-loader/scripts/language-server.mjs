/** Local WebSocket transport for the existing GTS Node language server. */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { WebSocketServer } from "ws";
import { URI } from "vscode-uri";
import {
  createProcessStreamConnection,
  createWebSocketConnection,
} from "vscode-ws-jsonrpc/server";
import {
  createLanguageWorkspace,
  LANGUAGE_WORKSPACE,
} from "../src/dev-language-workspace.ts";

const require = createRequire(import.meta.url);
const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const browserRootUri = `file://${LANGUAGE_WORKSPACE}`;
const textKeys = new Set([
  "text",
  "newText",
  "message",
  "value",
  "label",
  "insertText",
  "filterText",
  "sortText",
  "detail",
]);

/** Map protocol URIs, including WorkspaceEdit keys, without rewriting source text. */
export function mapWorkspaceUris(value, from, to) {
  // Volar emits file:///c%3A/... while Node emits file:///C:/... on Windows.
  // Reuse Volar's URI normalization before comparing either spelling.
  const canonicalFrom = URI.parse(from).toString();
  const mapUri = (uri) => {
    if (!uri.startsWith("file:")) return uri;
    const canonical = URI.parse(uri).toString();
    return canonical === canonicalFrom ||
      canonical.startsWith(`${canonicalFrom}/`)
      ? to + canonical.slice(canonicalFrom.length)
      : uri;
  };
  const visit = (item, key = "") => {
    if (typeof item === "string")
      return textKeys.has(key) ? item : mapUri(item);
    if (Array.isArray(item)) return item.map((value) => visit(value, key));
    if (item && typeof item === "object")
      return Object.fromEntries(
        Object.entries(item).map(([name, value]) => [
          mapUri(name),
          visit(value, name),
        ]),
      );
    return item;
  };
  return visit(value);
}

export function isAllowedOrigin(origin, extraOrigins = []) {
  if (!origin) return true; // Local command-line LSP clients do not send Origin.
  if (extraOrigins.includes(origin)) return true;
  try {
    const url = new URL(origin);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

async function readDeclarations(directory, prefix = "") {
  const files = {};
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix + entry.name;
    if (entry.isDirectory())
      Object.assign(
        files,
        await readDeclarations(
          path.join(directory, entry.name),
          `${relative}/`,
        ),
      );
    else if (entry.isFile() && entry.name.endsWith(".d.ts"))
      files[relative] = await readFile(
        path.join(directory, entry.name),
        "utf8",
      );
  }
  return files;
}

export async function resolveNativeSdk(tsdk) {
  const sdk = tsdk
    ? path.resolve(tsdk)
    : path.dirname(require.resolve("typescript"));
  const manifest = JSON.parse(
    await readFile(path.join(sdk, "../package.json"), "utf8"),
  );
  if (
    manifest.name !== "typescript-native-bridge" ||
    !manifest.version.includes("-bridge.")
  ) {
    throw new Error(
      `后台必须使用 typescript-native-bridge；当前解析到 ${manifest.name}@${manifest.version} (${sdk})`,
    );
  }
  // Only the GTS child loads the compiler and native checker. Loading another
  // compiler into this small transport process would waste memory.
  return { sdk, name: manifest.name, version: manifest.version };
}

export async function startLanguageServer({
  port = 3001,
  host = "127.0.0.1",
  origins = [],
  maxSessions = 4,
  tsdk,
} = {}) {
  if (!Number.isInteger(maxSessions) || maxSessions < 1)
    throw new Error("maxSessions must be a positive integer");
  const engine = await resolveNativeSdk(tsdk);
  const files = createLanguageWorkspace(
    await readDeclarations(path.join(packageRoot, "dist/gts")),
  );
  const entry = require.resolve("@gi-tcg/gts-language-server/node");
  const sessions = new Set();
  const pending = new Set();
  const leases = new Set();
  const server = createServer((request, response) => {
    if (request.url === "/health") {
      response.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      response.end(
        JSON.stringify({
          service: "gts-language-server",
          engine: { name: engine.name, version: engine.version },
          sessions: sessions.size,
        }),
      );
    } else {
      response.writeHead(404);
      response.end();
    }
  });
  const sockets = new WebSocketServer({
    noServer: true,
    maxPayload: 2 * 1024 * 1024,
  });
  server.on("upgrade", (request, socket, head) => {
    if (
      request.url !== "/gts" ||
      !isAllowedOrigin(request.headers.origin, origins) ||
      leases.size >= maxSessions
    ) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    sockets.handleUpgrade(request, socket, head, (webSocket) =>
      sockets.emit("connection", webSocket),
    );
  });
  sockets.on("connection", (webSocket) => {
    leases.add(webSocket);
    // Install the existing JSON-RPC reader immediately: it buffers initialize
    // while the isolated project files are written.
    const socket = {
      send: (message) => webSocket.send(message),
      onMessage: (callback) =>
        webSocket.on("message", (data) => callback(data.toString())),
      onError: (callback) => webSocket.on("error", callback),
      onClose: (callback) => webSocket.on("close", callback),
      dispose: () => webSocket.close(),
    };
    const client = createWebSocketConnection(socket);
    const setup = async () => {
      const directory = await mkdtemp(
        path.join(tmpdir(), "gts-language-session-"),
      );
      let child, childClosed, serverConnection, cleanupPromise;
      let preparing = true;
      const cleanup = () =>
        (cleanupPromise ??= (async () => {
          client.reader.dispose();
          client.writer.dispose();
          serverConnection?.reader.dispose();
          serverConnection?.writer.dispose();
          if (webSocket.readyState < 2) webSocket.close();
          if (child && child.exitCode === null && child.signalCode === null) {
            child.kill();
            await childClosed;
          }
          // directory is created by mkdtemp above and is never client-controlled.
          await rm(directory, { recursive: true, force: true });
          sessions.delete(cleanup);
          leases.delete(webSocket);
        })());
      sessions.add(cleanup);
      webSocket.once("close", () => {
        if (!preparing) void cleanup().catch(console.error);
      });
      try {
        for (const [name, content] of Object.entries(files)) {
          const target = path.join(directory, name.slice(1));
          await mkdir(path.dirname(target), { recursive: true });
          await writeFile(target, content);
        }
        preparing = false;
        if (webSocket.readyState !== 1) {
          await cleanup();
          return;
        }
        const workspace = path.join(directory, LANGUAGE_WORKSPACE.slice(1));
        const workspaceUri = pathToFileURL(workspace).href;
        child = spawn(process.execPath, [entry, "--stdio"], {
          cwd: workspace,
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
        });
        childClosed = new Promise((resolve) => child.once("close", resolve));
        child.stderr.on("data", (data) =>
          process.stderr.write(`[GTS ${path.basename(directory)}] ${data}`),
        );
        child.once("error", (error) => {
          console.error(error);
          webSocket.close(1011, "GTS language server could not start");
          void cleanup().catch(console.error);
        });
        child.once("exit", (code, signal) => {
          if (code !== 0 && !cleanupPromise && webSocket.readyState < 2)
            console.error(
              `GTS language server exited: code=${code}, signal=${signal}`,
            );
          if (webSocket.readyState < 2)
            webSocket.close(
              code === 0 ? 1000 : 1011,
              "GTS language server exited",
            );
          void cleanup().catch(console.error);
        });
        serverConnection = createProcessStreamConnection(child);
        if (!serverConnection)
          throw new Error("GTS language server has no stdio transport");
        client.reader.onError((error) => {
          // vscode-ws-jsonrpc also reports ordinary page closure (1001) as a
          // reader error. The close handler already owns transport cleanup.
          if (webSocket.readyState >= 2) return;
          console.error(error);
          webSocket.close(1008, "Invalid language-service request");
        });
        client.forward(serverConnection, (message) => {
          const documentUri = message.params?.textDocument?.uri;
          if (documentUri !== undefined) {
            const normalized = new URL(documentUri).href;
            if (
              !normalized.startsWith(`${browserRootUri}/`) ||
              /%2f|%5c/i.test(normalized)
            ) {
              throw new Error("Document URI is outside this editor workspace");
            }
          }
          const mapped = mapWorkspaceUris(
            message,
            browserRootUri,
            workspaceUri,
          );
          if (mapped.method === "initialize") {
            // Server-controlled SDK/project; never accept a browser-supplied
            // filesystem, arbitrary tsdk path or another session's workspace.
            mapped.params = {
              ...mapped.params,
              rootPath: workspace,
              rootUri: workspaceUri,
              workspaceFolders: [{ uri: workspaceUri, name: "workspace" }],
              initializationOptions: { typescript: { tsdk: engine.sdk } },
            };
          }
          return mapped;
        });
        serverConnection.forward(client, (message) =>
          mapWorkspaceUris(message, workspaceUri, browserRootUri),
        );
        client.onClose(() => {
          void cleanup().catch(console.error);
        });
        serverConnection.onClose(() => {
          void cleanup().catch(console.error);
        });
      } catch (error) {
        preparing = false;
        console.error(error);
        webSocket.close(1011, "GTS language server initialization failed");
        await cleanup();
      }
    };
    const task = setup();
    pending.add(task);
    void task
      .catch((error) => {
        leases.delete(webSocket);
        console.error(error);
        client.reader.dispose();
        client.writer.dispose();
        webSocket.close(1011, "GTS language server initialization failed");
      })
      .finally(() => pending.delete(task));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  const address = server.address();
  return {
    port: address.port,
    engine,
    async close() {
      const closed = new Promise((resolve) => server.close(resolve));
      for (const socket of sockets.clients)
        socket.close(1001, "Server is stopping");
      await Promise.allSettled([...pending]);
      await Promise.allSettled([...sessions].map((dispose) => dispose()));
      sockets.close();
      await closed;
    },
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const { values } = parseArgs({
    options: {
      port: {
        type: "string",
        default: process.env.GTS_LANGUAGE_SERVER_PORT ?? "3001",
      },
      host: {
        type: "string",
        default: process.env.GTS_LANGUAGE_SERVER_HOST ?? "127.0.0.1",
      },
      origin: { type: "string", multiple: true },
      "max-sessions": {
        type: "string",
        default: process.env.GTS_LANGUAGE_SERVER_MAX_SESSIONS ?? "4",
      },
      tsdk: { type: "string", default: process.env.GTS_TSDK },
    },
  });
  const port = Number(values.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("Invalid --port");
  const service = await startLanguageServer({
    port,
    host: values.host,
    origins:
      values.origin ??
      process.env.GTS_LANGUAGE_SERVER_ORIGINS?.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    maxSessions: Number(values["max-sessions"]),
    tsdk: values.tsdk,
  });
  console.log(
    `GTS ${service.engine.name}@${service.engine.version}: ${values.host}:${service.port}/gts`,
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.once(signal, () => {
      void service.close().catch(console.error);
    });
}

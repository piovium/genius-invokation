import { once } from "node:events";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import type { AddressInfo } from "node:net";

const MAX_REQUEST_BODY_BYTES = 1024 * 1024;

export interface HttpListenOptions {
  hostname?: string;
  port?: number;
}

export interface HttpServerHandle {
  server: Server;
  url: URL;
  stop(): Promise<void>;
}

function requestHeaders({ rawHeaders }: IncomingMessage): Headers {
  const headers = new Headers();
  for (let index = 0; index < rawHeaders.length; index += 2) {
    headers.append(rawHeaders[index]!, rawHeaders[index + 1]!);
  }
  return headers;
}

/**
 * Serve a `fetch` handler over Node's HTTP server, streaming request and
 * response bodies instead of buffering them in memory.
 */
export async function listenHttp(
  handler: (request: Request) => Response | Promise<Response>,
  { hostname = "127.0.0.1", port = 0 }: HttpListenOptions = {},
): Promise<HttpServerHandle> {
  const server = createServer(async (incoming, outgoing) => {
    const abort = new AbortController();
    incoming.once("aborted", () => abort.abort());
    outgoing.once("close", () => {
      if (!outgoing.writableFinished) abort.abort();
    });
    let bodyTooLarge = false;
    try {
      const headers = requestHeaders(incoming);
      if (Number(headers.get("content-length") ?? 0) > MAX_REQUEST_BODY_BYTES) {
        incoming.resume();
        outgoing.writeHead(413).end();
        return;
      }
      const hasBody = incoming.method !== "GET" && incoming.method !== "HEAD";
      let receivedBodyBytes = 0;
      const body = hasBody
        ? Readable.toWeb(
            incoming.pipe(
              new Transform({
                transform(chunk, encoding, callback) {
                  receivedBodyBytes += chunk.length;
                  if (receivedBodyBytes > MAX_REQUEST_BODY_BYTES) {
                    bodyTooLarge = true;
                    callback(new Error("Request body is too large"));
                    return;
                  }
                  callback(null, chunk);
                },
              }),
            ),
          )
        : undefined;
      // `duplex: "half"` is what undici requires from every streaming request,
      // but the DOM `RequestInit` this project compiles against omits it.
      const init: RequestInit & { duplex: "half" } = {
        method: incoming.method,
        headers,
        // The DOM and node:stream/web stream types are not assignable to each
        // other even though undici accepts either one as a body.
        body: body as unknown as BodyInit,
        duplex: "half",
        signal: abort.signal,
      };
      // Route on the request target alone: Elysia 1.4 misses every route when
      // the URL authority is a bare host shorter than four characters, and the
      // Host header that would supply one is client-controlled.
      const { pathname, search } = new URL(
        incoming.url ?? "/",
        "http://localhost",
      );
      const response = await handler(
        new Request(new URL(`${pathname}${search}`, "http://localhost"), init),
      );
      if (bodyTooLarge) {
        await response.body?.cancel();
        outgoing.writeHead(413).end();
        return;
      }
      outgoing.statusCode = response.status;
      for (const [name, value] of response.headers)
        outgoing.setHeader(name, value);
      // Iterating a Headers object folds repeated Set-Cookie values into one,
      // so restore the raw list.
      const cookies = response.headers.getSetCookie();
      if (cookies.length) outgoing.setHeader("set-cookie", cookies);
      if (incoming.method === "HEAD" || !response.body) {
        await response.body?.cancel();
        outgoing.end();
        return;
      }
      await pipeline(
        Readable.fromWeb(response.body as unknown as NodeReadableStream),
        outgoing,
      );
    } catch {
      if (outgoing.headersSent) {
        outgoing.destroy();
        return;
      }
      outgoing.writeHead(bodyTooLarge ? 413 : 500).end();
    }
  });
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 15_000;
  // `listen` reports a bind failure through the 'error' event, which `once`
  // turns into a rejection before 'listening' can resolve.
  server.listen({ host: hostname, port });
  await once(server, "listening");
  const address = server.address() as AddressInfo;
  const addressHost = address.address.includes(":")
    ? `[${address.address}]`
    : address.address;
  const url = new URL(`http://${addressHost}:${address.port}/`);
  return {
    server,
    url,
    async stop() {
      // Keep-alive sockets would otherwise hold the listener open past `close`.
      const closed = promisify(server.close.bind(server))();
      server.closeIdleConnections();
      await closed;
    },
  };
}

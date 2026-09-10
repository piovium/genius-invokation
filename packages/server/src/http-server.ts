import { createServer, type IncomingMessage, type Server } from "node:http";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { AddressInfo } from "node:net";

const MAX_REQUEST_BODY_BYTES = 1024 * 1024;

export interface HttpListenOptions {
  hostname?: string;
  port?: number;
}

function requestHeaders({ rawHeaders }: IncomingMessage): Headers {
  const headers = new Headers();
  for (let index = 0; index < rawHeaders.length; index += 2) {
    headers.append(rawHeaders[index]!, rawHeaders[index + 1]!);
  }
  return headers;
}

export interface HttpServerHandle {
  server: Server;
  url: URL;
  stop(): Promise<void>;
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
                  } else callback(null, chunk);
                },
              }),
            ),
          )
        : undefined;
      // `duplex: "half"` is what undici requires from every streaming request.
      const init = {
        method: incoming.method,
        headers,
        body,
        duplex: "half",
        signal: abort.signal,
      } as RequestInit;
      const response = await handler(
        new Request(
          new URL(
            incoming.url ?? "/",
            "http://" + (incoming.headers.host ?? "localhost"),
          ),
          init,
        ),
      );
      if (bodyTooLarge) {
        await response.body?.cancel();
        outgoing.writeHead(413).end();
        return;
      }
      outgoing.statusCode = response.status;
      for (const [name, value] of response.headers)
        outgoing.setHeader(name, value);
      const cookies = response.headers.getSetCookie();
      if (cookies.length) outgoing.setHeader("set-cookie", cookies);
      if (incoming.method === "HEAD" || !response.body) {
        await response.body?.cancel();
        outgoing.end();
      } else {
        await pipeline(Readable.fromWeb(response.body as never), outgoing);
      }
    } catch {
      if (!outgoing.headersSent)
        outgoing.writeHead(bodyTooLarge ? 413 : 500).end();
      else outgoing.destroy();
    }
  });
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 15_000;
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host: hostname, port }, () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address() as AddressInfo;
  const addressHost = address.address.includes(":")
    ? `[${address.address}]`
    : address.address;
  const url = new URL(`http://${addressHost}:${address.port}/`);
  return {
    server,
    url,
    async stop() {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeIdleConnections();
      });
    },
  };
}

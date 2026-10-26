import { readFile } from "node:fs/promises";
import { extname, isAbsolute, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createJiti } from "jiti";
import { parse as parseYaml } from "yaml";
import JSON5 from "json5";
import { parse as parseToml } from "smol-toml";

export interface LoadedReference<T = unknown> {
  value: T;
  source: URL;
}
const isRemote = (url: URL) =>
  url.protocol === "https:" || url.protocol === "http:";

const hasProtocol = (reference: string) =>
  /^[a-z][a-z\d+.-]*:/i.test(reference);

const isRelativePath = (reference: string) => /^\.{1,2}[\\/]/.test(reference);

export function resolveReference(reference: string, parent: URL): URL {
  if (isRemote(parent)) {
    return resolveRemoteReference(reference, parent);
  }

  let url: URL;
  if (isAbsolute(reference)) {
    url = pathToFileURL(reference);
  } else if (hasProtocol(reference)) {
    url = new URL(reference);
  } else if (isRelativePath(reference)) {
    url = new URL(reference.replaceAll("\\", "/"), parent);
  } else {
    // package name
    url = new URL(import.meta.resolve(reference, parent.href));
  }
  if (url.protocol === "file:") {
    // normalize
    return pathToFileURL(fileURLToPath(url));
  }
  if (!isRemote(url)) {
    throw new Error(`Unsupported configuration protocol: ${url.protocol}`);
  }
  return url;
}

function resolveRemoteReference(reference: string, parent: URL): URL {
  let url: URL;
  if (reference.startsWith("/")) {
    url = new URL(reference, parent);
  } else if (isAbsolute(reference)) {
    throw new Error("Remote configuration cannot reference local files");
  } else if (hasProtocol(reference)) {
    url = new URL(reference);
  } else if (isRelativePath(reference)) {
    url = new URL(reference.replaceAll("\\", "/"), parent);
  } else {
    // package name
    throw new Error("Remote configuration cannot resolve local packages");
  }
  if (!isRemote(url)) {
    throw new Error(
      `Unsupported remote configuration protocol: ${url.protocol}`,
    );
  }
  return url;
}

export function configBase(directory: string): URL {
  return pathToFileURL(resolvePath(directory, "server.config.ts"));
}

export async function loadReference(
  reference: string,
  parent: URL,
): Promise<LoadedReference> {
  let source = resolveReference(reference, parent);
  const extension = extname(source.pathname).toLowerCase();
  if (/^\.[cm]?[jt]s$/.test(extension)) {
    if (isRemote(source)) {
      throw new Error("Remote executable configuration is not supported");
    }
    const jiti = createJiti(parent.href);
    let value = await jiti.import(fileURLToPath(source), { default: true });
    if (typeof value === "function") {
      value = await value();
    }
    return { value, source };
  }
  let text: string;
  if (isRemote(source)) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Cannot load ${source}: HTTP ${response.status}`);
    }
    source = new URL(response.url);
    text = await response.text();
  } else {
    text = await readFile(source, "utf8");
  }
  let value: unknown;
  switch (extension) {
    case ".json":
    case ".jsonc":
    case ".json5":
      value = JSON5.parse(text);
      break;
    case ".yaml":
    case ".yml":
      value = parseYaml(text);
      break;
    case ".toml":
      value = parseToml(text);
      break;
    case ".gts":
      value = { fileUri: source.href, content: text };
      break;
    default:
      throw new Error(`Unsupported configuration format: ${source}`);
  }
  return { value, source };
}

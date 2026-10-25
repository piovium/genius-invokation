import { readFile } from "node:fs/promises";
import { extname, isAbsolute, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve as resolveModule } from "import-meta-resolve";
import { createJiti } from "jiti";
import { parse as parseYaml } from "yaml";
import JSON5 from "json5";
import { parse as parseToml } from "smol-toml";

export interface LoadedReference {
  value: unknown;
  source: URL;
}
const remote = (url: URL) =>
  url.protocol === "https:" || url.protocol === "http:";

/** Every nested reference retains the declaring document's URL. */
export function resolveReference(reference: string, parent: URL): URL {
  let url: URL;
  if (remote(parent) && reference.startsWith("/")) {
    url = new URL(reference, parent);
  } else if (isAbsolute(reference)) {
    if (remote(parent))
      throw new Error("Remote configuration cannot reference local files");
    url = pathToFileURL(reference);
  } else if (/^[a-z][a-z\d+.-]*:/i.test(reference)) {
    url = new URL(reference);
  } else if (/^\.{1,2}[\\/]/.test(reference)) {
    url = new URL(reference.replaceAll("\\", "/"), parent);
  } else {
    if (remote(parent))
      throw new Error("Remote configuration cannot resolve local packages");
    url = new URL(resolveModule(reference, parent.href));
  }
  if (remote(parent) && !remote(url))
    throw new Error("Remote configuration cannot reference local files");
  if (url.protocol === "file:") return pathToFileURL(fileURLToPath(url));
  if (!remote(url))
    throw new Error(`Unsupported configuration protocol: ${url.protocol}`);
  return url;
}

export function configBase(directory: string): URL {
  return pathToFileURL(resolvePath(directory, "server.config.ts"));
}

export async function loadReference(
  reference: string,
  parent: URL,
  allowGts = false,
): Promise<LoadedReference> {
  let source = resolveReference(reference, parent);
  const extension = extname(source.pathname).toLowerCase();
  if (/^\.[cm]?[jt]s$/.test(extension)) {
    if (remote(source))
      throw new Error("Remote executable configuration is not supported");
    const jiti = createJiti(parent.href);
    let value = await jiti.import(fileURLToPath(source), { default: true });
    if (typeof value === "function") value = await value();
    return { value, source };
  }
  let text: string;
  if (remote(source)) {
    const response = await fetch(source);
    if (!response.ok)
      throw new Error(`Cannot load ${source}: HTTP ${response.status}`);
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
      if (!allowGts) throw new Error("GTS is only supported for Mod sources");
      value = { fileUri: source.href, content: text };
      break;
    default:
      throw new Error(`Unsupported configuration format: ${source}`);
  }
  return { value, source };
}

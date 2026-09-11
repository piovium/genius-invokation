import { WEB_CLIENT_BASE_PATH } from "@gi-tcg/config";

/**
 * The URL layout the API and the browser client share: where the client is
 * mounted, the API subtree under that mount, and the mount as a router reports
 * it, without a trailing slash.
 */
export function apiMount(basePath: string = WEB_CLIENT_BASE_PATH) {
  const segments = basePath.split("/").filter(Boolean);
  const base = `/${segments.join("/")}${segments.length ? "/" : ""}`;
  return {
    base,
    apiBase: `${base}api`,
    rootPath: base === "/" ? "/" : base.slice(0, -1),
  };
}

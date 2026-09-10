/**
 * Upstream packages advertise every runtime they *could* target as an optional
 * peer dependency, and pnpm resolves optional peers eagerly. Left alone, that
 * writes packages into our lockfile that this workspace can never load.
 *
 * The rule is derived rather than hand-maintained: for the packages the server
 * loads at runtime, drop the optional peers that no workspace project declares.
 * Anything the server actually ships is named in a manifest, so it survives.
 *
 * Removing a peer from `peerDependencies` alone would turn it into a *required*
 * peer, so `peerDependenciesMeta` is trimmed in lockstep.
 */
const { existsSync, readFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");

const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];

const workspaceRoot = __dirname;

function readManifest(...segments) {
  const path = join(workspaceRoot, ...segments);
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Names the server package loads at runtime; their peers are never dropped. */
const serverRuntimeDependencies = new Set(
  Object.keys(
    readManifest("packages", "server", "package.json")?.dependencies ?? {},
  ),
);

/** Every name any workspace project declares, used to recognise peers in use. */
const declaredDependencyNames = new Set(
  [
    readManifest("package.json"),
    ...readdirSync(join(workspaceRoot, "packages"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => readManifest("packages", entry.name, "package.json")),
  ].flatMap((manifest) =>
    DEPENDENCY_FIELDS.flatMap((field) => Object.keys(manifest?.[field] ?? {})),
  ),
);

module.exports = {
  hooks: {
    readPackage(pkg) {
      if (!serverRuntimeDependencies.has(pkg.name)) return pkg;
      for (const [peerName, meta] of Object.entries(
        pkg.peerDependenciesMeta ?? {},
      )) {
        if (meta?.optional !== true || declaredDependencyNames.has(peerName)) {
          continue;
        }
        delete pkg.peerDependencies?.[peerName];
        delete pkg.peerDependenciesMeta[peerName];
      }
      return pkg;
    },
  },
};

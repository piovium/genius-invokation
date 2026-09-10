/**
 * Upstream packages advertise what they *could* run on, and pnpm resolves that
 * eagerly: optional peers become real packages, and a bundler plugin carries
 * the Bun toolchain its own type declarations need. This workspace runs on Node
 * and ships none of it, so both would only write dead packages into the lockfile.
 *
 * The rules are derived rather than hand-maintained. Anything a workspace
 * project names in a manifest survives, so only undeclared capabilities go.
 */
const { existsSync, readFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");

const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];

/** Runtimes this workspace never targets; a dependency on one is dead weight. */
const UNTARGETED_RUNTIMES = new Set(["bun", "bun-types", "@types/bun"]);

const workspaceRoot = __dirname;

function readManifest(...segments) {
  const path = join(workspaceRoot, ...segments);
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Packages the server loads at runtime; only these get their optional peers pruned. */
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
      dropUntargetedRuntimes(pkg);
      if (serverRuntimeDependencies.has(pkg.name)) dropUnusedOptionalPeers(pkg);
      return pkg;
    },
  },
};

/** Drop every dependency on a runtime this workspace does not build for. */
function dropUntargetedRuntimes(pkg) {
  for (const field of DEPENDENCY_FIELDS)
    for (const name of Object.keys(pkg[field] ?? {}))
      if (UNTARGETED_RUNTIMES.has(name) && !declaredDependencyNames.has(name))
        delete pkg[field][name];
}

/**
 * A package the server loads at runtime advertises every runtime it could
 * target as an optional peer; drop the ones no workspace project declares.
 * Removing a peer from `peerDependencies` alone would turn it into a required
 * peer, so `peerDependenciesMeta` is trimmed in lockstep.
 */
function dropUnusedOptionalPeers(pkg) {
  for (const [peerName, meta] of Object.entries(
    pkg.peerDependenciesMeta ?? {},
  )) {
    if (meta?.optional !== true || declaredDependencyNames.has(peerName)) {
      continue;
    }
    delete pkg.peerDependencies?.[peerName];
    delete pkg.peerDependenciesMeta[peerName];
  }
}

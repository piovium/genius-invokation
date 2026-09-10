/**
 * Upstream packages advertise more than this workspace uses: a runtime they
 * *could* run on and an optional peer they *could* load. pnpm resolves both
 * eagerly, so an unused one only adds dead packages to the lockfile; a bundler
 * plugin, for instance, declares the Bun type package its own Bun entry needs.
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

/** Every name any workspace project declares, used to recognize peers in use. */
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

/** Drop every dependency on a runtime this workspace never targets. */
function dropUntargetedRuntimes(pkg) {
  for (const field of DEPENDENCY_FIELDS) {
    for (const name of Object.keys(pkg[field] ?? {})) {
      if (UNTARGETED_RUNTIMES.has(name) && !declaredDependencyNames.has(name)) {
        delete pkg[field][name];
      }
    }
  }
}

/**
 * A package the server loads at runtime advertises every optional peer it could
 * use (native add-ons, alternative drivers, runtime type packages); drop the
 * ones no workspace project declares. Removing a peer from `peerDependencies`
 * alone would turn it into a required peer, so `peerDependenciesMeta` is
 * trimmed in lockstep.
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

module.exports = {
  hooks: {
    readPackage(pkg) {
      dropUntargetedRuntimes(pkg);
      if (serverRuntimeDependencies.has(pkg.name)) dropUnusedOptionalPeers(pkg);
      return pkg;
    },
  },
};

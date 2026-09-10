/**
 * Some upstream packages advertise every runtime they *could* target as an
 * optional peer, and pnpm resolves optional peers eagerly. That drags packages
 * into our lockfile that this workspace can never load: drizzle-orm offers the
 * Prisma pair plus `bun-types` for its other drivers, and elysia offers
 * `@types/bun` for its Bun build. We only ever use node-postgres on Node.js, so
 * those peers are dropped here.
 *
 * Removing a peer from `peerDependencies` alone would turn it into a *required*
 * peer, so `peerDependenciesMeta` is trimmed in lockstep.
 *
 * pnpm rewrites a stored entry only when it re-resolves that package, so the
 * elysia entry still carries `@types/bun` from an earlier resolution; the hook
 * takes effect the next time the lockfile is regenerated wholesale.
 */
const UNUSED_OPTIONAL_PEERS = {
  "drizzle-orm": ["prisma", "@prisma/client", "bun-types", "@types/bun"],
  elysia: ["@types/bun", "bun-types"],
};

module.exports = {
  hooks: {
    readPackage(pkg) {
      for (const name of UNUSED_OPTIONAL_PEERS[pkg.name] ?? []) {
        delete pkg.peerDependencies?.[name];
        delete pkg.peerDependenciesMeta?.[name];
      }
      return pkg;
    },
  },
};

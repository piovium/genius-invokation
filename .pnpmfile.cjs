/**
 * drizzle-orm declares an optional peer for every database driver it can talk
 * to. pnpm auto-installs optional peers, so the Prisma pair would be downloaded
 * and built even though this service only imports the node-postgres driver.
 */
module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.name !== "drizzle-orm") return pkg;
      for (const name of ["prisma", "@prisma/client"]) {
        delete pkg.peerDependencies?.[name];
        delete pkg.peerDependenciesMeta?.[name];
      }
      return pkg;
    },
  },
};

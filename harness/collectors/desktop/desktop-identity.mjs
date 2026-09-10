// The pinned compiler identity this gate is allowed to accept.
//
// Resolved from the gate's own checkout, never from the observation, so a
// collector cannot simply describe the engine it would like to have used.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function resolveCheckoutIdentity({ root, contract, plan, platform = process.platform, arch = process.arch }) {
  const repository = path.join(root, contract.repositories[plan.repository].path);
  const manifestPath = path.join(repository, plan.extension.manifest);
  if (!fs.existsSync(path.join(repository, 'package.json')) || !fs.existsSync(manifestPath)) {
    throw new Error('GTS checkout or GamingTS extension manifest is unavailable');
  }
  const extension = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const require = createRequire(path.join(repository, 'package.json'));
  let packagePath, modulePath, nativeManifestPath, nativeAddonPath;
  try {
    packagePath = require.resolve('typescript/package.json');
    modulePath = fs.realpathSync(require.resolve('typescript/lib/typescript.js'));
    nativeManifestPath = require.resolve(
      `${plan.native.nativePackageTemplate.replace('{platform}', platform).replace('{arch}', arch)}/package.json`,
    );
    nativeAddonPath = path.join(path.dirname(nativeManifestPath), plan.native.addonRelativePath);
  } catch (error) {
    throw new Error(`Cannot resolve the pinned native engine from the GTS checkout: ${error.message}`);
  }
  const manifest = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const nativeManifest = JSON.parse(fs.readFileSync(nativeManifestPath, 'utf8'));
  if (!fs.existsSync(nativeAddonPath)) throw new Error('The pinned native addon is missing from the GTS checkout');
  return {
    root, repository, tsdk: path.dirname(modulePath),
    packageName: manifest.name, packageVersion: manifest.version,
    manifestPath: packagePath, manifestSha256: sha256(fs.readFileSync(packagePath)),
    modulePath, moduleSha256: sha256(fs.readFileSync(modulePath)), moduleBytes: fs.statSync(modulePath).size,
    nativePackageName: nativeManifest.name, nativePackageVersion: nativeManifest.version,
    nativeManifestPath, nativeManifestSha256: sha256(fs.readFileSync(nativeManifestPath)),
    nativeAddonPath, nativeAddonSha256: sha256(fs.readFileSync(nativeAddonPath)),
    nativeAddonBytes: fs.statSync(nativeAddonPath).size,
    extension: { id: `${extension.publisher}.${extension.name}`, version: extension.version, main: extension.main },
  };
}

/** The identity must equal the sealed contract pin and the reviewed extension. */
export function assertIdentity(identity, { contract, plan, platform = process.platform, arch = process.arch }) {
  if (identity.packageName !== 'typescript-native-bridge') {
    throw new Error(`The checkout resolves ${identity.packageName} instead of the TNB compiler`);
  }
  if (identity.packageVersion !== contract.tnbVersion) {
    throw new Error(`The checkout resolves TNB ${identity.packageVersion} instead of the contract pin ${contract.tnbVersion}`);
  }
  if (identity.extension.id !== plan.extension.id) {
    throw new Error(`The checkout builds ${identity.extension.id} instead of ${plan.extension.id}`);
  }
  const expected = plan.native.nativePackageTemplate.replace('{platform}', platform).replace('{arch}', arch);
  if (identity.nativePackageName !== expected) {
    throw new Error(`The native package is ${identity.nativePackageName} instead of ${expected}`);
  }
  return identity;
}

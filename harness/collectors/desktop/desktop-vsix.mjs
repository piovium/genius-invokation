// Packed-VSIX support for the desktop gate.
//
// The gate must measure the extension the product actually ships, so the
// packed mode is validated from the real `.vsix` bytes and from the isolated
// directory VS Code installed it into. The ZIP reader below is written against
// the format itself, so this stays dependency-free and reproducible.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createHash } from 'node:crypto';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export { sha256 };

export const defaultRequiredMembers = [
  'extension/package.json', 'extension/dist/extension.js', 'extension/dist/server.js',
  'extension/language-configuration.json', 'extension/syntaxes/GamingTS.tmLanguage.json',
  'extension/node_modules/typescript/package.json',
  'extension/node_modules/@volar/typescript/lib/node/proxyCreateProgram.js',
];

/** The SDK the packed extension must carry, and the addon it must dlopen. */
export function pinnedMemberPaths({ plan, platform = process.platform, arch = process.arch }) {
  const native = plan.native.nativePackageTemplate.replace('{platform}', platform).replace('{arch}', arch);
  return {
    pluginBundles: plan.packed.pluginPackages.map(name =>
      `extension/node_modules/${name}/${plan.packed.pluginBundle}`),
    nativeAddon: `extension/node_modules/${native}/${plan.native.addonRelativePath}`,
  };
}

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

export function readCentralDirectory(bytes) {
  const eocdSignature = 0x06054b50, centralSignature = 0x02014b50, localSignature = 0x04034b50;
  let eocd = -1;
  for (let at = bytes.length - 22; at >= 0 && at > bytes.length - 22 - 65536; at--) {
    if (bytes.readUInt32LE(at) === eocdSignature) { eocd = at; break; }
  }
  if (eocd < 0) throw new Error('The packed artifact is not a ZIP/VSIX archive');
  const count = bytes.readUInt16LE(eocd + 10);
  const size = bytes.readUInt32LE(eocd + 12);
  const offset = bytes.readUInt32LE(eocd + 16);
  if (offset + size > bytes.length) throw new Error('The VSIX central directory is truncated');
  const entries = [];
  let cursor = offset;
  for (let index = 0; index < count; index++) {
    if (bytes.readUInt32LE(cursor) !== centralSignature) throw new Error('The VSIX central directory is malformed');
    const method = bytes.readUInt16LE(cursor + 10);
    const crc = bytes.readUInt32LE(cursor + 16);
    const compressedBytes = bytes.readUInt32LE(cursor + 20);
    const uncompressedBytes = bytes.readUInt32LE(cursor + 24);
    const nameLength = bytes.readUInt16LE(cursor + 28);
    const extraLength = bytes.readUInt16LE(cursor + 30);
    const commentLength = bytes.readUInt16LE(cursor + 32);
    const externalAttributes = bytes.readUInt32LE(cursor + 38);
    const localOffset = bytes.readUInt32LE(cursor + 42);
    const name = bytes.toString('utf8', cursor + 46, cursor + 46 + nameLength);
    if (!name || name.includes('\\') || name.startsWith('/') || name.split('/').includes('..')) {
      throw new Error(`Unsafe VSIX member name: ${JSON.stringify(name)}`);
    }
    if (((externalAttributes >>> 16) & 0xf000) === 0xa000) throw new Error(`The VSIX contains a symlink: ${name}`);
    if (bytes.readUInt32LE(localOffset) !== localSignature) throw new Error(`The VSIX member ${name} has no local header`);
    const dataStart = localOffset + 30 + bytes.readUInt16LE(localOffset + 26) + bytes.readUInt16LE(localOffset + 28);
    const data = bytes.subarray(dataStart, dataStart + compressedBytes);
    let content;
    if (method === 0) content = Buffer.from(data);
    else if (method === 8) content = zlib.inflateRawSync(data);
    else throw new Error(`The VSIX member ${name} uses an unsupported compression method ${method}`);
    if (content.length !== uncompressedBytes) throw new Error(`The VSIX member ${name} changed size while reading`);
    if (crc32(content) !== crc) throw new Error(`The VSIX member ${name} failed its CRC check`);
    if (!name.endsWith('/')) {
      entries.push({ name, method, crc32: crc, bytes: uncompressedBytes, sha256: sha256(content), content });
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/**
 * The name the extension's own pack script gives its artifact. The VSIX carries
 * build timestamps, so its container hash differs between runs: only the hash
 * of the artifact this run measured is ever meaningful.
 */
export function vsixOutputName({ manifest, platform = process.platform, arch = process.arch }) {
  const target = `${platform}-${arch === 'arm' ? 'armhf' : arch}`;
  return `${manifest.name}-${manifest.version}-${target}.vsix`;
}

/**
 * Build the artifact inside the run with the product's own pack script.
 *
 * The collector never accepts a `.vsix` a human happened to leave behind: the
 * extension the gate measures must be the one this run produced from this
 * checkout. Only the VSIX is written into the run directory; the product's
 * script stages its deployment in the system temporary directory, which the
 * evidence manifest never hashes.
 */
export async function packVsix({
  core, repository, plan, directory, output, timeoutMs, limitBytes,
  env = {}, platform = process.platform, arch = process.arch,
}) {
  const node = process.env.HARNESS_NODE, manager = process.env.HARNESS_MANAGER;
  if (!node || !manager) {
    throw new Error('The sealed runner did not provide HARNESS_NODE/HARNESS_MANAGER for the product pack script');
  }
  if (!fs.existsSync(path.join(repository, plan.extension.manifest))) {
    throw new Error(`The extension manifest is unavailable: ${plan.extension.manifest}`);
  }
  return core.execute({
    executable: node,
    args: [manager, '--filter', plan.extension.packageName, 'run', plan.extension.packScript, output],
    cwd: repository, directory, label: plan.extension.packLabel,
    timeoutMs, limitBytes, env,
  });
}

export function inspectVsix({ file, expectedSha256, plan, identity = null,
  requiredMembers = defaultRequiredMembers, platform = process.platform, arch = process.arch }) {
  const bytes = fs.readFileSync(file);
  if (sha256(bytes) !== expectedSha256) throw new Error('The VSIX changed after it was recorded');
  const entries = readCentralDirectory(bytes);
  const names = new Set(entries.map(entry => entry.name));
  const pinned = pinnedMemberPaths({ plan, platform, arch });
  for (const name of [...requiredMembers, ...pinned.pluginBundles, pinned.nativeAddon]) {
    if (!names.has(name)) throw new Error(`The VSIX has no ${name}`);
  }
  const memberSha256 = name => sha256(entries.find(entry => entry.name === name).content);
  const entryFor = name => entries.find(entry => entry.name === name);
  const manifest = JSON.parse(entries.find(entry => entry.name === 'extension/package.json').content.toString('utf8'));
  if (`${manifest.publisher}.${manifest.name}` !== plan.extension.id) {
    throw new Error(`The VSIX packages ${manifest.publisher}.${manifest.name} instead of ${plan.extension.id}`);
  }
  if (manifest.main !== './dist/extension.js') throw new Error('The VSIX manifest entry point changed');
  const manifestXml = entries.find(entry => entry.name === 'extension.vsixmanifest');
  if (!manifestXml) throw new Error('The VSIX has no extension.vsixmanifest');
  const identityElement = /<Identity\b([^>]*)\/?>/.exec(manifestXml.content.toString('utf8'));
  if (!identityElement) throw new Error('The VSIX manifest declares no Identity');
  const attributes = Object.fromEntries([...identityElement[1].matchAll(/([A-Za-z]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
  if (attributes.Publisher !== manifest.publisher || attributes.Id !== manifest.name) {
    throw new Error('The VSIX manifest identity disagrees with its package.json');
  }
  if (attributes.Version !== manifest.version) throw new Error('The VSIX manifest version disagrees with its package.json');
  const target = `${platform}-${arch === 'arm' ? 'armhf' : arch}`;
  if (attributes.TargetPlatform && attributes.TargetPlatform !== target) {
    throw new Error(`The VSIX targets ${attributes.TargetPlatform} instead of ${target}`);
  }
  // The packaged compiler must be the pinned one the checkout resolved, and the
  // addon it dlopens must be the very file the checkout was measured with. The
  // container hash changes between runs; these member hashes do not.
  const packagedSdk = JSON.parse(entryFor('extension/node_modules/typescript/package.json').content.toString('utf8'));
  if (packagedSdk.name !== 'typescript-native-bridge') {
    throw new Error(`The VSIX packages ${packagedSdk.name} instead of the TNB compiler`);
  }
  if (identity) {
    if (packagedSdk.version !== identity.packageVersion) {
      throw new Error(`The VSIX packages ${packagedSdk.name}@${packagedSdk.version} instead of ${identity.packageVersion}`);
    }
    if (memberSha256(pinned.nativeAddon) !== identity.nativeAddonSha256) {
      throw new Error('The VSIX carries a native addon the checkout was not measured with');
    }
  }
  return {
    file, sha256: expectedSha256, bytes: bytes.length, version: manifest.version,
    targetPlatform: attributes.TargetPlatform ?? null,
    members: Object.fromEntries(entries.map(entry => [entry.name, { sha256: entry.sha256, bytes: entry.bytes }])),
  };
}

/** The isolated extension directory must contain exactly the measured extension. */
export function installedExtensionDirectory({ extensionsDirectory, plan }) {
  if (!fs.existsSync(extensionsDirectory)) throw new Error('The isolated extension directory was never created');
  const found = [];
  for (const name of fs.readdirSync(extensionsDirectory).sort()) {
    const entry = path.join(extensionsDirectory, name);
    if (!fs.statSync(entry).isDirectory()) {
      if (!['extensions.json', '.obsolete'].includes(name)) throw new Error(`Unexpected file in the isolated extension directory: ${name}`);
      continue;
    }
    const manifestPath = path.join(entry, 'package.json');
    if (!fs.existsSync(manifestPath)) throw new Error(`The installed extension ${name} has no package.json`);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (`${manifest.publisher}.${manifest.name}` !== plan.extension.id) {
      throw new Error(`Another extension contaminated the isolated directory: ${manifest.publisher}.${manifest.name}`);
    }
    found.push({ directory: entry, manifest });
  }
  if (found.length !== 1) throw new Error(`Expected exactly one installed extension, found ${found.length}`);
  return found[0];
}

/** Compare the installed tree against the VSIX membership that produced it. */
export function inspectInstalledExtension({ extensionPath, vsix, plan }) {
  const files = {};
  const walk = (relative = '') => {
    const absolute = relative ? path.join(extensionPath, relative) : extensionPath;
    for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) throw new Error(`The installed extension follows a link: ${name}`);
      if (entry.isDirectory()) walk(name);
      else files[name] = { sha256: sha256(fs.readFileSync(path.join(extensionPath, name))), bytes: fs.statSync(path.join(extensionPath, name)).size };
    }
  };
  walk();
  const expected = Object.fromEntries(Object.entries(vsix.members)
    .filter(([name]) => name.startsWith('extension/'))
    .map(([name, value]) => [name.slice('extension/'.length), value]));
  for (const [name, value] of Object.entries(expected)) {
    if (!files[name]) throw new Error(`The installed extension is missing ${name}`);
    if (name !== 'package.json' && (files[name].sha256 !== value.sha256 || files[name].bytes !== value.bytes)) {
      throw new Error(`The installed ${name} differs from the packed VSIX`);
    }
  }
  const manifestPath = path.join(extensionPath, 'package.json');
  const installed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const { __metadata, ...plain } = installed;
  if (plain.version !== vsix.version) throw new Error('The installed extension version differs from the VSIX');
  return { extensionPath, manifestPath, manifestSha256: files['package.json'].sha256, version: installed.version,
    metadata: __metadata ?? null, files: Object.keys(files).sort() };
}

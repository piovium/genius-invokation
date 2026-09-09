import { execFile } from "node:child_process";
import { readFile, readdir, readlink } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function hasWindowsListener(output, pid, port) {
  return output.split(/\r?\n/).some((line) => {
    const fields = line.trim().split(/\s+/);
    if (fields.length !== 5 || fields[0].toUpperCase() !== "TCP" || fields[3] !== "LISTENING") {
      return false;
    }
    const localPort = /:(\d+)$/.exec(fields[1]);
    return Boolean(localPort && Number(localPort[1]) === port && /^\d+$/.test(fields[4]) && Number(fields[4]) === pid);
  });
}

export function parseLinuxListeningInodes(output, port) {
  const inodes = new Set();
  for (const line of output.split(/\r?\n/)) {
    const fields = line.trim().split(/\s+/);
    if (fields.length < 10 || fields[3] !== "0A") {
      continue;
    }
    const localPort = /^[0-9a-f]+:([0-9a-f]{4})$/i.exec(fields[1]);
    if (localPort && Number.parseInt(localPort[1], 16) === port && /^[1-9]\d*$/.test(fields[9])) {
      inodes.add(fields[9]);
    }
  }
  return inodes;
}

export function hasLsofPid(output, pid) {
  return output.split(/\r?\n/).some((line) => /^p[1-9]\d*$/.test(line) && Number(line.slice(1)) === pid);
}

function targetPort(pid, baseUrl) {
  if (!Number.isSafeInteger(pid) || pid <= 0) {
    throw new TypeError("pid must be a positive safe integer");
  }
  const url = new URL(baseUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError("baseUrl must use HTTP or HTTPS");
  }
  const hostname = url.hostname.toLowerCase();
  const ipv4 = hostname.split(".");
  const loopbackV4 = ipv4.length === 4 && ipv4[0] === "127" && ipv4.every(
    (part) => /^\d+$/.test(part) && Number(part) <= 255,
  );
  if (hostname !== "localhost" && hostname !== "[::1]" && !loopbackV4) {
    throw new TypeError("baseUrl must point to localhost, an IPv4 loopback address, or [::1]");
  }
  return Number(url.port || (url.protocol === "https:" ? 443 : 80));
}

async function ownsLinuxListener(pid, port) {
  const tables = await Promise.allSettled([
    readFile("/proc/net/tcp", "utf8"),
    readFile("/proc/net/tcp6", "utf8"),
  ]);
  const inodes = new Set();
  let readableTables = 0;
  for (const table of tables) {
    if (table.status === "fulfilled") {
      readableTables++;
      for (const inode of parseLinuxListeningInodes(table.value, port)) {
        inodes.add(inode);
      }
    } else if (table.reason.code !== "ENOENT") {
      throw table.reason;
    }
  }
  if (!readableTables) {
    throw new Error("Neither /proc/net/tcp nor /proc/net/tcp6 is readable");
  }
  if (!inodes.size) {
    return false;
  }
  const fdDirectory = `/proc/${pid}/fd`;
  const descriptors = await readdir(fdDirectory);
  const links = await Promise.allSettled(
    descriptors.map((descriptor) => readlink(`${fdDirectory}/${descriptor}`)),
  );
  let ownsListener = false;
  for (const link of links) {
    if (link.status === "fulfilled") {
      const socket = /^socket:\[(\d+)\]$/.exec(link.value);
      if (socket && inodes.has(socket[1])) {
        ownsListener = true;
      }
    } else if (link.reason.code !== "ENOENT") {
      // A descriptor may close during inspection. Other errors, especially
      // access denial, must never be treated as a successful ownership check.
      throw link.reason;
    }
  }
  return ownsListener;
}

/**
 * Require the sampled PID to own a TCP listener on the local URL's port.
 * This checks the process directly: a package-manager parent or an unrelated
 * long-running process cannot stand in for the server being measured.
 */
export async function verifyTarget(pid, baseUrl) {
  const port = targetPort(pid, baseUrl);
  const options = {
    encoding: "utf8",
    windowsHide: true,
    timeout: 5000,
    maxBuffer: 4 * 1024 * 1024,
  };
  let verified = false;
  let source;
  try {
    switch (process.platform) {
      case "win32": {
        const { stdout } = await execFileAsync("netstat.exe", ["-ano", "-p", "tcp"], options);
        verified = hasWindowsListener(stdout, pid, port);
        if (!verified) {
          // Windows treats TCPv6 as a separate -p protocol and omits it from
          // the TCP query, even though both outputs label their rows "TCP".
          const ipv6 = await execFileAsync("netstat.exe", ["-ano", "-p", "tcpv6"], options);
          verified = hasWindowsListener(ipv6.stdout, pid, port);
        }
        source = "windows:netstat";
        break;
      }
      case "linux":
        verified = await ownsLinuxListener(pid, port);
        source = "linux:/proc/net/tcp+fd";
        break;
      case "darwin": {
        const { stdout } = await execFileAsync(
          "lsof",
          ["-nP", "-a", "-p", String(pid), `-iTCP:${port}`, "-sTCP:LISTEN", "-F", "p"],
          options,
        );
        verified = hasLsofPid(stdout, pid);
        source = "darwin:lsof";
        break;
      }
      default:
        throw new Error(`Unsupported target verification platform: ${process.platform}`);
    }
    if (!verified) {
      throw new Error(`Process ${pid} does not own a TCP listener on port ${port}`);
    }
    return { pid, port, source };
  } catch (cause) {
    throw new Error(`Cannot verify target PID ${pid} on port ${port}: ${cause.message}`, { cause });
  }
}

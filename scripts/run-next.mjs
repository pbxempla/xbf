#!/usr/bin/env node
// Starts Next.js (`dev` or `start`) on the port from the PORT setting.
//
// Next.js reads PORT from the process environment before it loads .env files, so a PORT written
// only in .env would be ignored. Port order: the real environment (Docker, hosting), then PORT in
// .env, then 3000. A `-p` or `--port` passed on the command line always wins.
//
// Usage: node scripts/run-next.mjs <dev|start> [extra next arguments]
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [mode, ...extra] = process.argv.slice(2);

if (mode !== "dev" && mode !== "start") {
  console.error("Usage: node scripts/run-next.mjs <dev|start> [next arguments]");
  process.exit(1);
}

function validPort(value) {
  const port = Number(value);
  return Number.isInteger(port) && port >= 1 && port <= 65535 ? String(port) : null;
}

function portFromEnvFile() {
  const file = resolve(root, ".env");
  if (!existsSync(file)) return null;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?PORT\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const value = match[1].replace(/\s+#.*$/, "").replace(/^(["'])(.*)\1$/, "$2");
    return validPort(value);
  }
  return null;
}

const hasPortFlag = extra.some(
  (arg) => arg === "-p" || arg === "--port" || arg.startsWith("--port="),
);
const fromProcess = validPort(process.env.PORT);
const port = fromProcess ?? portFromEnvFile() ?? "3000";

const args = [mode, ...(hasPortFlag ? [] : ["-p", port]), ...extra];

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next", { paths: [root] });

const child = spawn(process.execPath, [nextBin, ...args], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, PORT: hasPortFlag ? process.env.PORT : port },
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code, signal) => {
  process.exit(signal ? 1 : (code ?? 0));
});

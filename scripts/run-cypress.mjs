import { spawn } from "node:child_process";
import { resolve } from "node:path";

const isWindows = process.platform === "win32";
const cypressCommand = resolve(
  process.cwd(),
  isWindows ? "node_modules/.bin/cypress.cmd" : "node_modules/.bin/cypress",
);
const [mode = "run", ...args] = process.argv.slice(2);

if (mode !== "open" && mode !== "run") {
  console.error(`Unsupported Cypress mode: ${mode}`);
  process.exit(1);
}

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(cypressCommand, [mode, ...args], {
  cwd: process.cwd(),
  env,
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

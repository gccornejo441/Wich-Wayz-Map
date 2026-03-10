import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
const appUrl = "http://localhost:3100/";
const apiHealthUrl = "http://localhost:3001/api/locations/count";
const headed = process.argv.includes("--headed");
const extraArgs = process.argv.slice(2).filter((arg) => arg !== "--headed");
const timeoutMs = 180000;
const requestTimeoutMs = 5000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForExit = async (child, alreadyExited, timeoutMs) => {
  if (alreadyExited()) {
    return true;
  }

  return Promise.race([
    new Promise((resolve) => child.once("exit", () => resolve(true))),
    wait(timeoutMs).then(() => false),
  ]);
};

const waitForHealthyUrl = async (url, didExit, getExitCode) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (didExit()) {
      throw new Error(`npm run dev:all exited with code ${getExitCode()}`);
    }

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
      if (response.ok) {
        return;
      }
    } catch {}

    await wait(1000);
  }

  throw new Error(`Timed out waiting for ${url}`);
};

const stopProcessTree = async (child, alreadyExited) => {
  if (!child.pid || alreadyExited()) {
    return;
  }

  if (isWindows) {
    try {
      child.kill("SIGINT");
    } catch {}

    if (await waitForExit(child, alreadyExited, 3000)) {
      return;
    }

    await new Promise((resolve) => {
      const taskkill = spawn(
        "taskkill",
        ["/pid", String(child.pid), "/t"],
        { stdio: "ignore" },
      );
      taskkill.on("exit", () => resolve());
      taskkill.on("error", () => resolve());
    });

    if (await waitForExit(child, alreadyExited, 3000)) {
      return;
    }

    await new Promise((resolve) => {
      const taskkill = spawn(
        "taskkill",
        ["/pid", String(child.pid), "/t", "/f"],
        { stdio: "ignore" },
      );
      taskkill.on("exit", () => resolve());
      taskkill.on("error", () => resolve());
    });

    await waitForExit(child, alreadyExited, 5000);
    return;
  }

  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", () => resolve())),
    wait(5000).then(() => {
      try {
        child.kill("SIGKILL");
      } catch {}
    }),
  ]);
};

const runCypress = async () => {
  const npmArgs = ["run", "cypress:run"];
  const cypressArgs = [...extraArgs];

  if (headed) {
    cypressArgs.push("--headed");
  }

  if (cypressArgs.length > 0) {
    npmArgs.push("--", ...cypressArgs);
  }

  const child = spawn(npmCommand, npmArgs, {
    cwd: process.cwd(),
    stdio: "inherit",
  });

  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 0));
  });
};

const main = async () => {
  const devServer = spawn(npmCommand, ["run", "dev:all"], {
    cwd: process.cwd(),
    stdio: "inherit",
  });

  let devServerExited = false;
  let devServerExitCode = 0;

  devServer.on("exit", (code) => {
    devServerExited = true;
    devServerExitCode = code ?? 0;
  });

  const didExit = () => devServerExited;
  const getExitCode = () => devServerExitCode;

  const shutdown = async (exitCode) => {
    await stopProcessTree(devServer, didExit);
    process.exit(exitCode);
  };

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      void shutdown(1);
    });
  }

  try {
    await waitForHealthyUrl(appUrl, didExit, getExitCode);
    await waitForHealthyUrl(apiHealthUrl, didExit, getExitCode);
    const exitCode = await runCypress();
    await shutdown(exitCode);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    await shutdown(1);
  }
};

void main();

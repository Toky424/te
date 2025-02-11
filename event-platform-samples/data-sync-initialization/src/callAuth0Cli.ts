import { spawn } from "child_process";
import ora from "ora";

export const callAuth0Cli = (args: string[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    const allArgs = ["--no-input", "--tenant", process.env.TENANT, ...args];
    const spawned = spawn("auth0", allArgs, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });
    let stdout = "";
    let stderr = "";

    spawned.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    spawned.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    spawned.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });

    spawned.on("error", (err) => {
      reject(err);
    });
  });
};

export async function checkForAuth0Cli() {
  const cliCheck = ora({
    text: `Checking that the Auth0 CLI has been installed`,
  }).start();
  try {
    await callAuth0Cli(["--version"]);
    cliCheck.succeed();
  } catch (e) {
    cliCheck.fail(
      "The Auth0 CLI must be installed: https://github.com/auth0/auth0-cli"
    );
    process.exit(1);
  }
}

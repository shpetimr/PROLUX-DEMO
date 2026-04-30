const { spawnSync } = require("child_process");
const path = require("path");

const reactScriptsBin = path.resolve(
  __dirname,
  "..",
  "node_modules",
  "react-scripts",
  "bin",
  "react-scripts.js"
);

const args = process.argv.slice(2);
const command = args[0];
const env = { ...process.env };

if (command === "test") {
  env.CI = env.CI || "true";
}

env.NODE_OPTIONS = [env.NODE_OPTIONS, "--no-deprecation"]
  .filter(Boolean)
  .join(" ");

const result = spawnSync(process.execPath, [reactScriptsBin, ...args], {
  cwd: path.resolve(__dirname, ".."),
  env,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);

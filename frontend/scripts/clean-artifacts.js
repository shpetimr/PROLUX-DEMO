const fs = require("fs");
const path = require("path");

const frontendDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(frontendDir, "..");

const targets = [
  path.join(frontendDir, "build"),
  path.join(frontendDir, "dist-new"),
  path.join(repoRoot, "artifacts", "backend-publish"),
];

const assertSafeTarget = (target) => {
  const relativeToRoot = path.relative(repoRoot, target);
  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    throw new Error(`Refusing to clean outside the repository: ${target}`);
  }
};

for (const target of targets) {
  assertSafeTarget(target);
  fs.rmSync(target, { recursive: true, force: true });
  console.log(`Cleaned ${path.relative(repoRoot, target)}`);
}

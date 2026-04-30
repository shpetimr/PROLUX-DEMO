const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const expandEnvReferences = (value) =>
  value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (match, bracedName, bareName) => {
    const name = bracedName || bareName;
    return process.env[name] || match;
  });

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return;
  }

  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = expandEnvReferences(value);
    }
  }
};

loadEnvFile(path.join(__dirname, "..", ".env"));

const getFirstEnv = (...names) => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return "";
};

const buildFrontendUrlFromParts = () => {
  const scheme = getFirstEnv("PROLUX_FRONTEND_SCHEME", "REACT_APP_FRONTEND_SCHEME");
  const host = getFirstEnv("PROLUX_FRONTEND_HOST", "REACT_APP_FRONTEND_HOST");
  const port = getFirstEnv("PROLUX_FRONTEND_PORT", "PORT", "REACT_APP_FRONTEND_PORT");

  if (!scheme || !host) {
    return "";
  }

  const normalizedScheme = scheme.replace(/[:/\\]+$/, "");
  const normalizedPort = port ? `:${port.replace(/^:/, "")}` : "";
  return `${normalizedScheme}://${host}${normalizedPort}`;
};

const targetUrl =
  getFirstEnv("PROLUX_FRONTEND_DEV_URL", "REACT_APP_DEV_SERVER_URL") ||
  buildFrontendUrlFromParts();
if (!targetUrl) {
  console.error(
    "Frontend dev URL is not configured. Set PROLUX_FRONTEND_DEV_URL or PROLUX_FRONTEND_SCHEME/HOST/PORT."
  );
  process.exit(1);
}

const timeoutMs = Number.parseInt(
  process.env.PROLUX_FRONTEND_WAIT_TIMEOUT_MS || "60000",
  10
);
const intervalMs = Number.parseInt(
  process.env.PROLUX_FRONTEND_WAIT_INTERVAL_MS || "1000",
  10
);
const deadline = Date.now() + timeoutMs;
const target = new URL(targetUrl);
const client = target.protocol === "https:" ? https : http;

const retry = () => {
  if (Date.now() > deadline) {
    console.error(`Timed out waiting for frontend at ${targetUrl}`);
    process.exit(1);
  }

  setTimeout(check, intervalMs);
};

const check = () => {
  const request = client.get(target, (response) => {
    response.resume();

    if (response.statusCode && response.statusCode < 500) {
      process.exit(0);
      return;
    }

    retry();
  });

  request.on("error", retry);
  request.setTimeout(2000, () => {
    request.destroy();
    retry();
  });
};

check();

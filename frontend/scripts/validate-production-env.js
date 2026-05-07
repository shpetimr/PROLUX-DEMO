const REQUIRED_API_URL_ENV = "REACT_APP_API_URL";
const EXPECTED_API_PATH_SUFFIX = "/api";
const loopbackHosts = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "host.docker.internal",
]);

const isNetlifyProductionBuild = () =>
  process.env.NETLIFY === "true" && process.env.CONTEXT === "production";

const normalizeHostname = (hostname) =>
  hostname?.replace(/^\[|\]$/g, "").toLowerCase() || "";

const isPrivateIpv4Hostname = (hostname) => {
  const octets = hostname.split(".").map((value) => Number(value));
  if (
    octets.length !== 4 ||
    octets.some(
      (value) => !Number.isInteger(value) || value < 0 || value > 255
    )
  ) {
    return false;
  }

  const [first, second] = octets;
  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254)
  );
};

const isLocalOnlyHostname = (hostname) => {
  const normalizedHostname = normalizeHostname(hostname);
  return (
    loopbackHosts.has(normalizedHostname) ||
    normalizedHostname.startsWith("127.") ||
    normalizedHostname.endsWith(".localhost") ||
    normalizedHostname.endsWith(".local") ||
    isPrivateIpv4Hostname(normalizedHostname)
  );
};

const normalizeApiPath = (pathname) => pathname.replace(/\/+$/, "") || "/";

const validateProductionApiUrl = (value) => {
  const configuredValue = value?.trim();
  if (!configuredValue) {
    return {
      ok: false,
      reason: `${REQUIRED_API_URL_ENV} is missing.`,
    };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(configuredValue);
  } catch {
    return {
      ok: false,
      reason: `${REQUIRED_API_URL_ENV} must be an absolute URL, for example https://<railway-backend-domain>/api.`,
    };
  }

  if (parsedUrl.protocol !== "https:") {
    return {
      ok: false,
      reason: `${REQUIRED_API_URL_ENV} must start with https:// for Netlify production builds.`,
    };
  }

  if (parsedUrl.username || parsedUrl.password) {
    return {
      ok: false,
      reason: `${REQUIRED_API_URL_ENV} must not include usernames or passwords.`,
    };
  }

  if (isLocalOnlyHostname(parsedUrl.hostname)) {
    return {
      ok: false,
      reason: `${REQUIRED_API_URL_ENV} must point to the public Railway backend, not localhost or a private network address.`,
    };
  }

  const normalizedPath = normalizeApiPath(parsedUrl.pathname);
  if (!normalizedPath.endsWith(EXPECTED_API_PATH_SUFFIX)) {
    return {
      ok: false,
      reason: `${REQUIRED_API_URL_ENV} must end with ${EXPECTED_API_PATH_SUFFIX} for this backend.`,
    };
  }

  if (parsedUrl.search || parsedUrl.hash) {
    return {
      ok: false,
      reason: `${REQUIRED_API_URL_ENV} must not include query strings or hash fragments.`,
    };
  }

  return {
    ok: true,
    apiBaseUrl: `${parsedUrl.origin}${normalizedPath}`,
  };
};

const formatValidationFailure = (reason) =>
  [
    "Netlify production environment validation failed.",
    "",
    reason,
    "",
    "Required Netlify environment variable:",
    `  ${REQUIRED_API_URL_ENV}=https://<railway-backend-domain>/api`,
    "",
    "Set it in Netlify before deploying production:",
    "  Site configuration > Environment variables > Add a variable",
    "",
    "Value rules:",
    "  - absolute https:// URL",
    "  - public backend address, not localhost or a private network",
    "  - ends with /api",
    "  - no query string, hash, username, or password",
    "",
    "Frontend env files must not contain database, PostgreSQL, or Supabase credentials.",
  ].join("\n");

const main = () => {
  if (!isNetlifyProductionBuild()) {
    process.exit(0);
  }

  const result = validateProductionApiUrl(process.env[REQUIRED_API_URL_ENV]);
  if (!result.ok) {
    console.error(formatValidationFailure(result.reason));
    process.exit(1);
  }

  console.log(
    `Netlify production env validation passed: ${REQUIRED_API_URL_ENV} is an HTTPS /api backend URL.`
  );
};

if (require.main === module) {
  main();
}

module.exports = {
  REQUIRED_API_URL_ENV,
  isNetlifyProductionBuild,
  validateProductionApiUrl,
  formatValidationFailure,
};

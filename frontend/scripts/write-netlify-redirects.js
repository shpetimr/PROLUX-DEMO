const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  REQUIRED_API_URL_ENV,
  isNetlifyProductionBuild,
  validateProductionApiUrl,
  formatValidationFailure,
} = require("./validate-production-env");

const isNetlifyBuild = process.env.NETLIFY === "true";
const isNetlifyProxyDisabled =
  process.env.REACT_APP_DISABLE_NETLIFY_API_PROXY === "true";

const redirectsPath = path.resolve(__dirname, "..", "build", "_redirects");
const spaFallbackRedirect = "/*      /index.html  200";

const writeRedirects = (lines) => {
  fs.writeFileSync(redirectsPath, `${lines.join(os.EOL)}${os.EOL}`);
};

if (!isNetlifyBuild) {
  process.exit(0);
}

if (isNetlifyProxyDisabled) {
  console.log(
    "Netlify API proxy redirect generation skipped: REACT_APP_DISABLE_NETLIFY_API_PROXY=true."
  );
  process.exit(0);
}

const configuredApiUrl = process.env[REQUIRED_API_URL_ENV]?.trim();
if (!configuredApiUrl) {
  if (isNetlifyProductionBuild()) {
    console.error(
      formatValidationFailure(`${REQUIRED_API_URL_ENV} is missing.`)
    );
    process.exit(1);
  }

  console.warn(
    `Netlify API proxy redirect generation skipped: ${REQUIRED_API_URL_ENV} is not set.`
  );
  process.exit(0);
}

const validationResult = validateProductionApiUrl(configuredApiUrl);
if (!validationResult.ok) {
  console.error(formatValidationFailure(validationResult.reason));
  process.exit(1);
}

writeRedirects([
  `/api/*  ${validationResult.apiBaseUrl}/:splat  200!`,
  spaFallbackRedirect,
]);

console.log(
  `Netlify API proxy redirect generated from ${REQUIRED_API_URL_ENV}.`
);

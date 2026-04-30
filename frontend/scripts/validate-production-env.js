const requiredProductionApiUrl = process.env.REACT_APP_API_URL?.trim();
const isNetlifyProductionBuild =
  process.env.NETLIFY === "true" && process.env.CONTEXT === "production";

const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

if (!isNetlifyProductionBuild) {
  process.exit(0);
}

if (!requiredProductionApiUrl) {
  console.error(
    "Netlify production builds require REACT_APP_API_URL=https://<railway-backend-domain>/api."
  );
  process.exit(1);
}

let parsedUrl;
try {
  parsedUrl = new URL(requiredProductionApiUrl);
} catch {
  console.error("REACT_APP_API_URL must be an absolute HTTPS URL in production.");
  process.exit(1);
}

if (parsedUrl.protocol !== "https:") {
  console.error("REACT_APP_API_URL must use https:// in production.");
  process.exit(1);
}

const normalizedHostname = parsedUrl.hostname.replace(/^\[|\]$/g, "").toLowerCase();
if (loopbackHosts.has(normalizedHostname) || normalizedHostname.startsWith("127.")) {
  console.error("REACT_APP_API_URL must not point to localhost in production.");
  process.exit(1);
}

if (!parsedUrl.pathname.replace(/\/+$/, "").endsWith("/api")) {
  console.warn(
    "REACT_APP_API_URL usually should end with /api for this backend."
  );
}

const isLocalhost = () => {
  const { hostname } = window.location;

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("127.") ||
    hostname === "[::1]"
  );
};

const canUseServiceWorker = () =>
  "serviceWorker" in navigator &&
  (window.location.protocol === "https:" || isLocalhost());

const getServiceWorkerUrl = () => {
  const publicUrl = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
  return `${publicUrl}/sw.js`;
};

export function register() {
  if (process.env.NODE_ENV !== "production" || !canUseServiceWorker()) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(getServiceWorkerUrl())
      .then((registration) => {
        registration.update();

        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      })
      .catch((error) => {
        console.warn("PROLUX service worker registration failed.", error);
      });
  });
}

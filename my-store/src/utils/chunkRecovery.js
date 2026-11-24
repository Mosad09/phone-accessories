const CHUNK_RELOAD_STORAGE_KEY = "veltrix_chunk_reload_at";
const CHUNK_RELOAD_COOLDOWN_MS = 15000;

export function isChunkLoadError(error) {
  const msg = String(error?.message || error || "").toLowerCase();
  return (
    msg.includes("dynamically imported module") ||
    msg.includes("importing a module script failed") ||
    msg.includes("failed to fetch") ||
    msg.includes("loading chunk") ||
    msg.includes("mime type")
  );
}

export async function clearSwCaches() {
  if (typeof window === "undefined" || !("caches" in window)) return;
  try {
    const keys = await window.caches.keys();
    await Promise.all(keys.map((key) => window.caches.delete(key)));
  } catch {
    // Ignore cache cleanup errors in restricted browsing contexts
  }
}

export async function attemptChunkRecovery() {
  if (typeof window === "undefined") return false;
  try {
    const lastAttempt = Number(window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY) || 0);
    const now = Date.now();
    if (now - lastAttempt <= CHUNK_RELOAD_COOLDOWN_MS) {
      return false;
    }
    window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(now));
    await clearSwCaches();
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

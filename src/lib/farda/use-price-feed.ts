import { useEffect } from "react";
import { previewPathPrefix } from "@/lib/preview-path-prefix";
import { parsePriceFeed } from "./price-feed";
import { usePlan } from "./store";

const FEED_PATH = "/prices.json";
const FETCH_TIMEOUT_MS = 8_000;
const REFRESH_AFTER_MS = 30 * 60 * 1000;

function feedUrl(): string {
  // Path-based preview hosts serve the app under a prefix that the router hides.
  const prefix = previewPathPrefix(window.location.hostname, window.location.pathname) ?? "";
  return `${prefix}${FEED_PATH}`;
}

/**
 * Pulls the latest price feed when the app opens (and when it comes back to the
 * foreground after a while). Any failure is silent: the app keeps working with
 * the last feed it saved, or the catalog prices.
 */
export function usePriceFeed(enabled: boolean) {
  const applyFeed = usePlan((s) => s.applyFeed);

  useEffect(() => {
    if (!enabled) return;
    let lastRun = 0;
    let controller: AbortController | null = null;

    async function load() {
      lastRun = Date.now();
      controller?.abort();
      const current = new AbortController();
      controller = current;
      const timeout = setTimeout(() => current.abort(), FETCH_TIMEOUT_MS);
      try {
        // "no-cache" revalidates with the server, so a new feed is seen right away
        // while an unchanged one costs only a 304.
        const response = await fetch(feedUrl(), { cache: "no-cache", signal: current.signal });
        if (!response.ok) return;
        const feed = parsePriceFeed(await response.json());
        if (feed) applyFeed(feed);
      } catch {
        // Offline, timed out or invalid JSON: keep the prices we already have.
      } finally {
        clearTimeout(timeout);
      }
    }

    void load();
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastRun > REFRESH_AFTER_MS) {
        void load();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller?.abort();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, applyFeed]);
}

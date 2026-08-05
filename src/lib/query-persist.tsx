import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import type { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/**
 * Bump when the shape of any cached query payload changes so old cached
 * entries are dropped instead of hydrated into new code.
 */
const CACHE_VERSION = "bitquest-cache-v1";

/**
 * Only rarely-changing, structural data is written to localStorage. Volatile
 * things (gem balance, streak, chest state — the `profile` query, and the song
 * queue which flips on every purchase/playback) are deliberately excluded so
 * they always come from the network.
 */
const PERSISTED_KEYS = new Set(["path", "unit", "songs", "song-title"]);

function isPersistable(queryKey: readonly unknown[]): boolean {
  return typeof queryKey[0] === "string" && PERSISTED_KEYS.has(queryKey[0]);
}

export function PersistedQueryProvider({
  client,
  children,
}: {
  client: QueryClient;
  children: ReactNode;
}) {
  // SSR has no localStorage: fall back to a plain, memory-only provider.
  if (typeof window === "undefined") {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: CACHE_VERSION,
    throttleTime: 1000,
  });

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        buster: CACHE_VERSION,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.state.status === "success" && isPersistable(query.queryKey),
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
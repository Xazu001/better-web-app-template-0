import * as React from "react";

const emptySubscribe = () => () => {};

/**
 * Returns `false` during SSR and the hydration render, `true` afterwards.
 * Use it to gate client-only rendering (e.g. `createPortal`) without the
 * `setState`-inside-`useEffect` pattern, which triggers a cascading render.
 */
function useHydrated(): boolean {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export { useHydrated };

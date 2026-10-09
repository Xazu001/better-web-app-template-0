import * as React from "react";

import type { ToastContainerProps } from "react-toastify";

const LazyToastContainer = React.lazy(
  (): Promise<{ default: React.ComponentType<ToastContainerProps> }> =>
    import.meta.env.SSR
      ? Promise.resolve({ default: () => null })
      : import("react-toastify").then((m) => ({ default: m.ToastContainer }))
);

const subscribe = () => () => {};

/**
 * Client-only ToastContainer — keeps react-toastify out of the server bundle
 * and loads it lazily after hydration.
 */
function ToastContainer(props: ToastContainerProps) {
  const mounted = React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  if (!mounted) return null;

  return (
    <React.Suspense fallback={null}>
      <LazyToastContainer {...props} />
    </React.Suspense>
  );
}

export { ToastContainer };

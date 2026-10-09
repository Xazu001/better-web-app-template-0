import * as React from "react";

// Breakpoint values in pixels
const breakpoints = {
  phone: 480,
  tablet: 768,
  desktop: 1020,
  largeDesktop: 1236,
  xlargeDesktop: 1440,
  huge: 1920
} as const;

type Breakpoint = keyof typeof breakpoints;

/**
 * Hook to check if the screen width is below a specific breakpoint.
 * Uses matchMedia API to respond to window resize events.
 *
 * @param breakpoint - The breakpoint to check against (default: "tablet")
 * @returns boolean indicating if screen is below the breakpoint
 *
 * @example
 * ```tsx
 * const isMobile = useBreakpoint("tablet");
 * if (isMobile) {
 *   // Show mobile layout
 * }
 * ```
 */
export function useBreakpoint(breakpoint: Breakpoint = "tablet"): boolean {
  const query = `(max-width: ${breakpoints[breakpoint] - 1}px)`;

  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener("change", onChange);
      return () => mediaQuery.removeEventListener("change", onChange);
    },
    [query]
  );

  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}

// Keep backward compatibility
export const useIsMobile = useBreakpoint;

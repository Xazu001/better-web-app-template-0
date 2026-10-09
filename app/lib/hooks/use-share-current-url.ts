import * as React from "react";
import { useLocation } from "react-router";

export function useShareCurrentUrl() {
  const location = useLocation();

  return React.useCallback(async () => {
    if (typeof window === "undefined") {
      return false;
    }

    const url = new URL(
      `${location.pathname}${location.search}${location.hash}`,
      window.location.origin
    ).toString();

    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch (error) {
      console.error("Clipboard failed:", error);
      return false;
    }
  }, [location.hash, location.pathname, location.search]);
}

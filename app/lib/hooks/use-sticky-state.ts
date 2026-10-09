import * as React from "react";

// useState backed by localStorage: the value survives reloads, and a broken
// or unavailable storage falls back to the initial value.
export function useStickyState<T>(
  key: string,
  initial: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = React.useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored === null ? initial : (JSON.parse(stored) as T);
    } catch {
      return initial;
    }
  });
  React.useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage unavailable (private mode, quota) — the preference is lost, nothing breaks
    }
  }, [key, value]);
  return [value, setValue];
}

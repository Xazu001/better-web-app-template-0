import * as React from "react";

// One live indicator for whatever the caller is doing right now: a spinner
// while an operation runs, a bar when its size is known, a tick or a cross
// when it ends.
export interface Activity {
  label: string;
  state: "running" | "done" | "error";
  done?: number;
  total?: number;
  unit?: "bytes" | "items" | "seconds";
}

// Serialises user-triggered async actions: one at a time, busy flag, the
// last error, and the activity entry for the progress strip. The action
// receives an AbortSignal; cancel() aborts the current operation (cooperative
// — long transfers check it between chunks).
export function useAsyncAction() {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [activity, setActivity] = React.useState<Activity | null>(null);
  const working = React.useRef(false);
  const controllerRef = React.useRef<AbortController | null>(null);

  const working_ = React.useCallback(
    (label: string, done?: number, total?: number, unit: Activity["unit"] = "bytes") =>
      setActivity({ label, state: "running", done, total, unit }),
    []
  );
  const finished = React.useCallback((label: string) => setActivity({ label, state: "done" }), []);

  const run = React.useCallback(async (action: (signal: AbortSignal) => Promise<void>) => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError("");
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      await action(controller.signal);
      setActivity((current) =>
        current?.state === "running" ? { label: current.label, state: "done" } : current
      );
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
      setActivity((current) =>
        current?.state === "running"
          ? { label: `${current.label} — ${message}`, state: "error" }
          : current
      );
    } finally {
      working.current = false;
      controllerRef.current = null;
      setBusy(false);
    }
  }, []);

  const cancel = React.useCallback(() => controllerRef.current?.abort(), []);
  const clearActivity = React.useCallback(() => {
    setActivity(null);
    setError("");
  }, []);

  return { busy, error, setError, activity, clearActivity, run, cancel, working_, finished };
}

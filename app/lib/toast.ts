import type { ToastOptions } from "react-toastify";

type ToastKind = "success" | "error";

const notify =
  (kind: ToastKind) =>
  (content: string, options?: ToastOptions): void => {
    // Guarded so the whole library stays out of the server bundle —
    // toast calls only ever run in the browser anyway.
    if (import.meta.env.SSR) return;
    void import("react-toastify").then((m) => m.toast[kind](content, options));
  };

export const toast = {
  success: notify("success"),
  error: notify("error")
};

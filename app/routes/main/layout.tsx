import { Outlet } from "react-router";

// ──────────────────────────────────────────────────────────────
// Route Component
// ──────────────────────────────────────────────────────────────

export default function MainAppLayout() {
  return (
    <>
      <Outlet />
    </>
  );
}

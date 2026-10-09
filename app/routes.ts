import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  // API resource routes (no UI)
  route("api/cookie-consent", "routes/api/cookie-consent.tsx"),
  route("api/logout", "routes/api/logout.tsx"),
  route("api/auth/confirm/:verificationCode", "routes/api/auth/confirm.$verificationCode.tsx"),

  // 404 catch-all
  route("*", "routes/$.tsx"),

  // Auth
  layout("routes/auth/layout.tsx", [
    route("login", "routes/auth/login.tsx"),
    route("register", "routes/auth/register.tsx")
  ]),

  // Main
  layout("routes/main/layout.tsx", [index("routes/main/home.tsx")]),

  // Status (global standalone)
  route("status", "routes/status.tsx"),

  // Admin
  layout("routes/admin/layout.tsx", [
    route("admin", "routes/admin/index.tsx", { index: true }),
    route("admin/users", "routes/admin/users.tsx"),
    route("admin/users/:userId", "routes/admin/users.$userId.tsx"),
    route("admin/status", "routes/status.tsx", { id: "admin-status" })
  ])
] satisfies RouteConfig;

import type { Plugin } from "vite";

/**
 * The Cloudflare Vite plugin copies `.dev.vars` into the server bundle for the
 * local preview. That preview-only secrets copy must not ship with deployment
 * artifacts, so this removes it (and any `.dev.vars.*` variant) at build end.
 */
export function excludeDevVars(): Plugin {
  return {
    name: "exclude-dev-vars",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      for (const name of Object.keys(bundle)) {
        const base = name.split("/").pop() ?? name;
        if (base === ".dev.vars" || base.startsWith(".dev.vars.")) {
          delete bundle[name];
        }
      }
    }
  };
}

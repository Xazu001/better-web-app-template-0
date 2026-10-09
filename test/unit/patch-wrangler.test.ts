import { describe, expect, it } from "vitest";

import { applyWranglerIds } from "../../scripts/lib/patch-wrangler";

const CONFIG = `{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "template",
  // Required when your login has access to multiple Cloudflare accounts:
  // "account_id": "00000000000000000000000000000000",
  "d1_databases": [
    {
      "binding": "db",
      "database_name": "template-db-dev",
      "database_id": "00000000-0000-0000-0000-000000000000"
    }
  ],
  "kv_namespaces": [
    {
      "id": "00000000000000000000000000000000",
      "binding": "kv"
    }
  ],
  "env": {
    "dev": {
      "d1_databases": [
        {
          "binding": "db",
          "database_name": "template-db-dev",
          "database_id": "00000000-0000-0000-0000-000000000000"
        }
      ],
      "kv_namespaces": [
        {
          "id": "00000000000000000000000000000000",
          "binding": "kv"
        }
      ]
    },
    "prod": {
      "d1_databases": [
        {
          "binding": "db",
          "database_name": "template-db-prod",
          "database_id": "00000000-0000-0000-0000-000000000000"
        }
      ],
      "kv_namespaces": [
        {
          "id": "00000000000000000000000000000000",
          "binding": "kv"
        }
      ]
    }
  }
}
`;

const IDS = {
  d1: {
    "template-db-dev": "d1-dev-real-id",
    "template-db-prod": "d1-prod-real-id"
  },
  kv: { dev: "kv-dev-real-id", prod: "kv-prod-real-id" }
};

describe("applyWranglerIds", () => {
  it("patches D1 ids per database_name across all environment blocks", () => {
    const out = applyWranglerIds(CONFIG, IDS);

    expect(out.match(/"database_id": "d1-dev-real-id"/g)).toHaveLength(2);
    expect(out).toContain('"database_id": "d1-prod-real-id"');
    expect(out).not.toContain('"database_id": "00000000-0000-0000-0000-000000000000"');
  });

  it("patches KV ids: top-level + env.dev share dev, env.prod gets prod", () => {
    const out = applyWranglerIds(CONFIG, IDS);

    expect(out.match(/"id": "kv-dev-real-id"/g)).toHaveLength(2);
    expect(out).toContain('"id": "kv-prod-real-id"');
  });

  it("never touches commented-out placeholders", () => {
    const out = applyWranglerIds(CONFIG, IDS);

    expect(out).toContain('// "account_id": "00000000000000000000000000000000"');
  });

  it("preserves comments and formatting", () => {
    const out = applyWranglerIds(CONFIG, IDS);

    expect(out).toContain('"$schema": "node_modules/wrangler/config-schema.json"');
    expect(out).toContain(
      "// Required when your login has access to multiple Cloudflare accounts:"
    );
  });

  it("returns text unchanged when no ids are provided", () => {
    const out = applyWranglerIds(CONFIG, { d1: {}, kv: { dev: null, prod: null } });

    expect(out).toBe(CONFIG);
  });

  it("handles the original replaceNth regression: repeated dev placeholders both patched", () => {
    // Regression: naive occurrence-counting replaced the wrong instances when
    // the same placeholder appeared in top-level + env.dev + env.prod.
    const out = applyWranglerIds(CONFIG, {
      d1: { "template-db-dev": "d1-dev-real-id" },
      kv: { dev: null, prod: null }
    });

    expect(out.match(/"database_id": "d1-dev-real-id"/g)).toHaveLength(2);
    expect(out).toContain('"database_id": "00000000-0000-0000-0000-000000000000"'); // prod untouched
  });
});

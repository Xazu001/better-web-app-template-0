/**
 *
 * Edits are computed on the JSONC AST (jsonc-parser) instead of naive string
 * replacement: comments (e.g. the commented-out `account_id` placeholder) are
 * preserved and can never be mistaken for a binding value.
 */
import { applyEdits, findNodeAtLocation, modify, parseTree } from "jsonc-parser";

import type { Edit, JSONPath, Node } from "jsonc-parser";

export interface WranglerIds {
  /** database_name → database_id (dev + prod names differ, so name-keyed) */
  d1: Record<string, string | null>;
  kv: { dev: string | null; prod: string | null };
}

function childIndexByProp(tree: Node, path: JSONPath, prop: string, value: string): number | null {
  const arrayNode = findNodeAtLocation(tree, path);
  if (!arrayNode || arrayNode.type !== "array") return null;

  const index = (arrayNode.children ?? []).findIndex((child) => {
    const propNode = findNodeAtLocation(child, [prop]);
    return propNode?.value === value;
  });

  return index === -1 ? null : index;
}

export function applyWranglerIds(text: string, ids: WranglerIds): string {
  const tree = parseTree(text);
  if (!tree) return text;

  const edits: Edit[] = [];

  // D1 — every binding whose database_name has a real id gets it patched,
  // regardless of which environment block it lives in.
  for (const [name, id] of Object.entries(ids.d1)) {
    if (!id) continue;
    for (const arrayPath of [
      ["d1_databases"],
      ["env", "dev", "d1_databases"],
      ["env", "prod", "d1_databases"]
    ]) {
      const index = childIndexByProp(tree, arrayPath, "database_name", name);
      if (index !== null) {
        edits.push(...modify(text, [...arrayPath, index, "database_id"], id, {}));
      }
    }
  }

  const kvTargets: Array<[JSONPath, string | null]> = [
    [["kv_namespaces"], ids.kv.dev],
    [["env", "dev", "kv_namespaces"], ids.kv.dev],
    [["env", "prod", "kv_namespaces"], ids.kv.prod]
  ];
  for (const [envPath, id] of kvTargets) {
    if (!id) continue;
    const index = childIndexByProp(tree, envPath, "binding", "kv");
    if (index !== null) {
      edits.push(...modify(text, [...envPath, index, "id"], id, {}));
    }
  }

  if (edits.length === 0) return text;
  return applyEdits(text, edits);
}

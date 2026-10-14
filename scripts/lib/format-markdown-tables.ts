import * as fs from "node:fs";
import * as path from "node:path";

interface FormatTableOptions {
  convertPipeTables?: boolean;
}

/**
 * Parses and formats a single ```table block into a clean, uniform representation.
 */
export function formatTableCodeBlock(blockContent: string): string {
  const lines = blockContent.split("\n");
  let headers: string[] = [];
  let inHeaders = false;

  interface TableRowData {
    keys?: Record<string, string>;
    positional?: string[];
  }

  const rows: TableRowData[] = [];
  let currentRowKeys: Record<string, string> | null = null;
  let currentRowPositional: string[] | null = null;
  let currentKey = "";

  function flushCurrentRow() {
    if (currentRowKeys) {
      rows.push({ keys: currentRowKeys });
      currentRowKeys = null;
      currentKey = "";
    } else if (currentRowPositional) {
      rows.push({ positional: currentRowPositional });
      currentRowPositional = null;
    }
  }

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const colsMatch = trimmed.match(/^(?:columns|headers|cols)\s*:(.*)$/i);
    if (colsMatch) {
      flushCurrentRow();
      const rest = colsMatch[1].trim();
      if (rest) {
        headers = rest
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      } else {
        inHeaders = true;
      }
      continue;
    }

    if (inHeaders) {
      const headerItemMatch = trimmed.match(/^[-*]\s+(.*)$/);
      if (headerItemMatch) {
        headers.push(headerItemMatch[1].trim());
        continue;
      } else if (!trimmed.startsWith("row:") && !trimmed.startsWith("- row:")) {
        headers.push(trimmed);
        continue;
      } else {
        inHeaders = false;
      }
    }

    const rowStartMatch = trimmed.match(/^(?:[-*]\s+)?row\s*:(.*)$/i);
    if (rowStartMatch) {
      flushCurrentRow();
      currentRowKeys = {};
      currentKey = "";
      const inlineRest = rowStartMatch[1].trim();
      if (inlineRest) {
        const kvMatch = inlineRest.match(/^([^:]+):\s*(.*)$/);
        if (kvMatch) {
          const k = kvMatch[1].trim();
          const v = kvMatch[2].trim();
          currentRowKeys[k] = v;
          currentKey = k;
        }
      }
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (
      bulletMatch &&
      (currentRowPositional || !currentRowKeys || Object.keys(currentRowKeys).length === 0)
    ) {
      if (!currentRowPositional) {
        currentRowPositional = [];
        currentRowKeys = null;
      }
      currentRowPositional.push(bulletMatch[1].trim());
      continue;
    }

    const fieldMatch = trimmed.match(/^([^:]+):\s*(.*)$/);
    if (fieldMatch && currentRowKeys !== null) {
      const candidateKey = fieldMatch[1].trim();
      const matchesHeader = headers.some((h) => h.toLowerCase() === candidateKey.toLowerCase());
      if (matchesHeader || candidateKey.length < 50) {
        currentKey = candidateKey;
        currentRowKeys[currentKey] = fieldMatch[2].trim();
        continue;
      }
    }

    if (currentRowKeys && currentKey) {
      currentRowKeys[currentKey] += " " + trimmed;
    } else if (currentRowPositional && currentRowPositional.length > 0) {
      currentRowPositional[currentRowPositional.length - 1] += " " + trimmed;
    }
  }

  flushCurrentRow();

  // Re-generate formatted block
  const outLines: string[] = [];
  outLines.push(`columns: ${headers.join(", ")}`);

  for (const row of rows) {
    outLines.push("");
    outLines.push("row:");
    if (row.keys) {
      for (const h of headers) {
        const matchingKey = Object.keys(row.keys).find((k) => k.toLowerCase() === h.toLowerCase());
        const val = matchingKey ? row.keys[matchingKey] : (row.keys[h] ?? "");
        outLines.push(`  ${h}: ${val}`);
      }
    } else if (row.positional) {
      for (const item of row.positional) {
        outLines.push(`  - ${item}`);
      }
    }
  }

  return outLines.join("\n");
}

/**
 * Converts a GFM pipe table to ```table block format.
 */
export function convertPipeTableToCodeBlock(headers: string[], rows: string[][]): string {
  const cleanHeaders = headers.map((h) => h.trim());
  const outLines: string[] = ["```table", `columns: ${cleanHeaders.join(", ")}`];

  for (const row of rows) {
    outLines.push("");
    outLines.push("row:");
    cleanHeaders.forEach((header, idx) => {
      const cell = (row[idx] ?? "").trim();
      outLines.push(`  ${header}: ${cell}`);
    });
  }

  outLines.push("```");
  return outLines.join("\n");
}

/**
 * Formats all markdown tables in content.
 * Handles both existing ```table blocks and legacy GFM pipe tables.
 */
export function formatMarkdownTables(
  content: string,
  options: FormatTableOptions = { convertPipeTables: true }
): string {
  const lines = content.split("\n");
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Existing ```table or ```table-data block
    if (/^```(?:table|table-data)\b/i.test(trimmed)) {
      const blockLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        blockLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith("```")) {
        i++;
      }

      const formattedInside = formatTableCodeBlock(blockLines.join("\n"));
      output.push("```table");
      output.push(formattedInside);
      output.push("```");
      continue;
    }

    // 2. Legacy GFM Pipe Table
    if (options.convertPipeTables && trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : "";
      const isDelimiter =
        nextLine.startsWith("|") &&
        nextLine.endsWith("|") &&
        nextLine
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim())
          .every((c) => /^:?-+:?$/.test(c));

      if (isDelimiter) {
        const headers = trimmed
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim());
        i += 2; // skip header and delimiter line

        const tableRows: string[][] = [];
        while (
          i < lines.length &&
          lines[i].trim().startsWith("|") &&
          lines[i].trim().endsWith("|")
        ) {
          const row = lines[i]
            .trim()
            .slice(1, -1)
            .split("|")
            .map((c) => c.trim());
          tableRows.push(row);
          i++;
        }

        const converted = convertPipeTableToCodeBlock(headers, tableRows);
        output.push(converted);
        continue;
      }
    }

    output.push(line);
    i++;
  }

  return output.join("\n");
}

// ──────────────────────────────────────────────────────────────
// CLI execution
// ──────────────────────────────────────────────────────────────

// Folders scanned for .md files when no CLI args are given (`pnpm fmt:tables`).
// Edit the list to add or remove targets; CLI args (files or folders) override it.
const DEFAULT_FOLDERS = ["public/docs"];

function collectMarkdownFiles(target: string): string[] {
  const abs = path.resolve(process.cwd(), target);
  if (!fs.existsSync(abs)) return [];
  if (fs.statSync(abs).isFile()) return abs.endsWith(".md") ? [abs] : [];

  const out: string[] = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.isDirectory())
      out.push(...collectMarkdownFiles(path.join(abs, entry.name)));
    else if (entry.name.endsWith(".md")) out.push(path.join(abs, entry.name));
  }
  return out;
}

function runCli() {
  const args = process.argv.slice(2);
  const targetPaths =
    args.length > 0
      ? args.flatMap(collectMarkdownFiles)
      : DEFAULT_FOLDERS.flatMap(collectMarkdownFiles);

  let modifiedCount = 0;
  for (const filePath of targetPaths) {
    const absPath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(absPath)) continue;

    const original = fs.readFileSync(absPath, "utf-8");
    const formatted = formatMarkdownTables(original, {
      convertPipeTables: true,
    });

    if (formatted !== original) {
      fs.writeFileSync(absPath, formatted, "utf-8");
      console.log(
        `Formatted markdown tables in: ${path.relative(process.cwd(), absPath)}`,
      );
      modifiedCount++;
    }
  }

  console.log(
    `Markdown table formatting complete. (${modifiedCount} file(s) updated)`,
  );
}

// If invoked directly from CLI
const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("format-markdown-tables.ts") ||
    process.argv[1].endsWith("format-markdown-tables.js") ||
    process.argv[1].endsWith("format-markdown-tables.mjs"));

if (isMain) {
  runCli();
}

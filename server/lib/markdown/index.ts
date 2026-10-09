import { Renderer, marked, type Tokens } from "marked";
import sanitizeHtml from "sanitize-html";

marked.setOptions({
  gfm: true,
  breaks: false
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N} _-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const TABLE_BLOCK_RE = /^columns\s*:/;
const TABLE_ROW_RE = /^row\s*:/;

/**
 * Checks whether a code block's body uses the custom table syntax:
 *
 *   columns: Name1, Name2
 *
 *   row:
 *     Name1: value
 *     Name2: value
 */
function isTableBlock(text: string): boolean {
  const first = text.split(/\r?\n/).find((line) => line.trim() !== "");
  return first !== undefined && TABLE_BLOCK_RE.test(first.trim());
}

/** Parses the custom `columns:`/`row:` table syntax into an HTML table. */
function renderTableBlock(text: string): string | null {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() !== "");
  const columnsLine = lines[start]?.trim() ?? "";
  if (!TABLE_BLOCK_RE.test(columnsLine)) {
    return null;
  }

  const columns = columnsLine
    .slice(columnsLine.indexOf(":") + 1)
    .split(",")
    .map((name) => name.trim());
  if (columns.length === 0) {
    return null;
  }
  const indexByName = new Map(columns.map((name, i) => [name, i]));

  const rows: string[][] = [];
  let row: string[] | null = null;
  let cell = -1;

  for (const raw of lines.slice(start + 1)) {
    const line = raw.trim();
    if (!line) {
      continue;
    }
    if (TABLE_ROW_RE.test(line)) {
      row = columns.map(() => "");
      rows.push(row);
      cell = -1;
      continue;
    }
    if (!row) {
      continue;
    }

    const colon = line.indexOf(":");
    const key = colon === -1 ? "" : line.slice(0, colon).trim();
    const index = indexByName.get(key) ?? -1;

    if (index !== -1) {
      cell = index;
      row[index] = line.slice(colon + 1).trim();
    } else if (cell !== -1) {
      row[cell] += `\n${line}`;
    }
  }

  const inline = (value: string) => marked.parseInline(value, { async: false });
  const head = columns.map((name) => `<th>${inline(name)}</th>`).join("");
  const body = rows
    .map((r) => `<tr>${r.map((value) => `<td>${inline(value)}</td>`).join("")}</tr>`)
    .join("\n");

  return `<table>\n<thead><tr>${head}</tr></thead>\n<tbody>\n${body}\n</tbody>\n</table>\n`;
}

/**
 * Renders Markdown to sanitized HTML safe for `dangerouslySetInnerHTML`.
 * Only tags/attributes produced by typical Markdown documents are allowed.
 */
export function renderMarkdown(source: string): string {
  const renderer = new Renderer();
  const headingIds = new Set<string>();

  const baseCode = renderer.code.bind(renderer);
  renderer.code = function (this: Renderer, token: Tokens.Code) {
    const lang = token.lang?.trim() ?? "";
    if (lang === "table" || isTableBlock(token.text)) {
      const table = renderTableBlock(token.text);
      if (table) {
        return table;
      }
    }
    return baseCode(token);
  };

  renderer.heading = function (this: Renderer, { tokens, depth }: Tokens.Heading) {
    const inner = this.parser.parseInline(tokens);
    const base = slugify(inner.replace(/<[^>]+>/g, ""));
    let id = base;
    for (let i = 1; headingIds.has(id); i++) {
      id = `${base}-${i}`;
    }
    if (id) {
      headingIds.add(id);
    }
    return `<h${depth}${id ? ` id="${id}"` : ""}>${inner}</h${depth}>\n`;
  };

  const html = marked.parse(source, { async: false, renderer });

  return sanitizeHtml(html, {
    allowedTags: [
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "p",
      "a",
      "img",
      "ul",
      "ol",
      "li",
      "blockquote",
      "pre",
      "code",
      "strong",
      "em",
      "del",
      "b",
      "i",
      "u",
      "s",
      "small",
      "mark",
      "abbr",
      "kbd",
      "cite",
      "dfn",
      "samp",
      "var",
      "sub",
      "sup",
      "time",
      "hr",
      "br",
      "span",
      "div",
      "table",
      "thead",
      "tbody",
      "tfoot",
      "caption",
      "tr",
      "th",
      "td",
      "figure",
      "figcaption",
      "details",
      "summary",
      "dl",
      "dt",
      "dd",
      "input"
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel", "id"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      code: ["class"],
      span: ["class"],
      input: ["type", "checked", "disabled"],
      th: ["align", "colspan", "rowspan"],
      td: ["align", "colspan", "rowspan"],
      ol: ["start", "reversed", "type"],
      li: ["value"],
      abbr: ["title"],
      time: ["datetime"],
      details: ["open"],
      h1: ["id"],
      h2: ["id"],
      h3: ["id"],
      h4: ["id"],
      h5: ["id"],
      h6: ["id"]
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"]
    },
    transformTags: {
      a: (_tagName, attribs) => {
        const href = attribs.href ?? "";
        const external = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(href);
        return {
          tagName: "a",
          attribs: external ? { ...attribs, rel: "noopener noreferrer", target: "_blank" } : attribs
        };
      },
      img: (_tagName, attribs) => ({
        tagName: "img",
        attribs: { loading: "lazy", ...attribs }
      }),
      input: (_tagName, attribs) => ({
        tagName: "input",
        attribs: { ...attribs, disabled: "disabled" }
      })
    }
  });
}

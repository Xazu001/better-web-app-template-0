# Markdown transformer — live example

This page is rendered from `public/docs/example.md`. The route loader fetches
the file **on the server** through the ASSETS binding, transforms it with
`renderMarkdown` (`marked` + `sanitize-html`), and returns sanitized HTML — no
markdown parsing ever runs in the browser.

## How this page works

```table
columns: Step, What happens

row:
  Step: 1. Request
  What happens: The browser asks for `/docs`

row:
  Step: 2. Assets fetch
  What happens: The loader reads `/docs/example.md` from `public/` via `env.ASSETS.fetch(...)`

row:
  Step: 3. Transform
  What happens: `renderMarkdown` converts the file into sanitized HTML

row:
  Step: 4. Render
  What happens: The page injects the HTML through `dangerouslySetInnerHTML`
```

The server-side code is one method on the route service:

```ts
// app/routes/main/docs.server.tsx
const response = await this.env.ASSETS.fetch(new URL("/docs/example.md", this.request.url));

if (!response.ok) {
  this.throw(this.responses.getNotFound("DOCUMENT_NOT_FOUND"));
}

const html = renderMarkdown(await response.text());
```

## Standard Markdown

Everything you would expect works: **bold**, _italic_, `inline code`,
keyboard input like <kbd>Ctrl</kbd> + <kbd>K</kbd>, and
[links](https://developers.cloudflare.com/workers/static-assets/binding-reference/)
— external ones open in a new tab automatically. Headings carry stable anchor
ids, so you can jump to [Standard Markdown](#standard-markdown) directly.

- Bullet lists with `gap`-free rhythm,
- nested items,
- and inline `code` inside items.

1. Ordered lists too,
2. with proper numbering.

Task lists render as disabled checkboxes on the server:

- [x] Markdown parsed and sanitized on the server
- [ ] Add your own documents to `public/docs/`

> Blockquotes get a primary-accent bar and a soft elevation background —
> no extra markup needed.

Standard GFM tables render alongside the fenced `table` format shown above:

| Feature      | Renderer | Sanitized |
| ------------ | -------- | --------- |
| Headings     | marked   | yes       |
| Tables       | marked   | yes       |
| Fenced table | custom   | yes       |

## Sanitization

`renderMarkdown` never trusts the document: only tags and attributes that
typical Markdown produces survive, unknown schemes are dropped, and raw HTML
like scripts is removed before the HTML reaches the page — which is what makes
`dangerouslySetInnerHTML` safe here.

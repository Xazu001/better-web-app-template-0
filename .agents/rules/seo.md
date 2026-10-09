# SEO — rules

> Route file conventions (`meta` placement, sections) → `routes.md`. `createMeta` implementation lives in `app/lib/seo/meta.ts`.

## What exists in the template

| File                             | Role                                                                                                            |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `app/lib/seo/meta.ts`            | `createMeta(matches, options?)` — builds title, description, OG, Twitter, robots + JSON-LD                      |
| `app/lib/seo/robots.ts`          | `isNoIndexPath(pathname)` — noindex detection for private prefixes (`/admin`, `/status`, `/login`, `/register`) |
| `app/lib/seo/structured-data.ts` | JSON-LD helpers: `organization`, `websiteSchema`, `pageSchema`, `itemListSchema`, `renderStructuredData`        |
| `app/lib/seo/crawler.ts`         | `isCrawler(request)` via `isbot`                                                                                |
| `app/entry.server.tsx`           | sets `X-Robots-Tag: noindex, nofollow` for noindex paths                                                        |
| `shared/constants/site.ts`       | `SITE_URL`, `BRAND_URL`, `APP_ENV`-dependent URL map                                                            |

## `createMeta`

Every route with a UI exports `meta` via `createMeta(matches, options)`:

```tsx
export const meta: Route.MetaFunction = ({ matches }) => {
  return createMeta(matches, {
    title: "Users",
    description: "Browse and manage user accounts.",
    noIndex: true
  });
};
```

- `title` is normalized to `App | <Page Name>` by `createTitle()`.
- `noIndex` auto-detects private prefixes from the last match's pathname — pass `noIndex: true` only when the path isn't covered by `isNoIndexPath` but still must stay out of search.
- Parent meta from `matches` is merged — new tags override parent ones per key.
- Pass `structuredData` (one object or array) to emit `script:ld+json` tags — serialize via `renderStructuredData` (already handled by `createMeta`).

## Private pages

- `/admin/**`, `/status`, `/login`, `/register` — always `noIndex: true` (auto via `isNoIndexPath`).
- `entry.server.tsx` additionally sets the `X-Robots-Tag` header for those paths.
- Never add a private route to `NO_INDEX_PREFIXES` retroactively without checking existing public URLs.

## JSON-LD

- Inject with `createMeta(..., { structuredData })` or `dangerouslySetInnerHTML={{ __html: renderStructuredData(schema) }}` in `<head>`.
- Always serialize with `renderStructuredData` — it escapes `<` to `\u003c`.
- Use `pageSchema` for generic pages, `itemListSchema` for collections.

## Canonical URLs

- `createMeta` builds `og:url` from `SITE_URL + pathname` — no manual canonical tags needed.
- Update the URL map in `shared/constants/site.ts` (`siteUrlMap`) when deployment domains change.

## Don't

- Don't hand-roll `meta` arrays with duplicated OG/Twitter boilerplate — always `createMeta`.
- Don't set `noIndex: false` to force indexing — omit it and let auto-detection run.
- Don't build sitemap/robots infrastructure until the project actually needs it — `public/robots.txt` is a static file.
- Don't inject JSON-LD without `renderStructuredData`.

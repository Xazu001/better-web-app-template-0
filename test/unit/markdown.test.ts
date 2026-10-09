import { describe, expect, it } from "vitest";

import { renderMarkdown } from "$/lib/markdown";

describe("renderMarkdown", () => {
  it("renders blocks and adds slugified heading ids", () => {
    const html = renderMarkdown("# My Title\n\nParagraph with **bold** and `code`.");

    expect(html).toContain('<h1 id="my-title">My Title</h1>');
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<code>code</code>");
  });

  it("numbers duplicate heading ids", () => {
    const html = renderMarkdown("## Section\n\n## Section");

    expect(html).toContain('<h2 id="section">Section</h2>');
    expect(html).toContain('<h2 id="section-1">Section</h2>');
  });

  it("renders the fenced `table` block format into an HTML table", () => {
    const html = renderMarkdown(
      "```table\ncolumns: Feature, Status\n\nrow:\n  Feature: Fenced tables\n  Status: Supported\n```"
    );

    expect(html).toContain("<table>");
    expect(html).toContain("<th>Feature</th>");
    expect(html).toContain("<td>Supported</td>");
    expect(html).not.toContain("columns:");
  });

  it("renders standard GFM pipe tables", () => {
    const html = renderMarkdown("| A | B |\n| --- | --- |\n| 1 | 2 |");

    expect(html).toContain("<th>A</th>");
    expect(html).toContain("<td>2</td>");
  });

  it("strips scripts and dangerous attributes", () => {
    const html = renderMarkdown('<script>alert("x")</script>\n\n<img src="x" onerror="alert(1)">');

    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert");
    expect(html).not.toContain("onerror");
  });

  it("hardens external links but leaves internal ones alone", () => {
    const html = renderMarkdown("[External](https://example.com) and [internal](#section) links.");

    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('<a href="#section">internal</a>');
  });
});

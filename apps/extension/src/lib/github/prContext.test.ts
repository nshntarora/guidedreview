import { afterEach, describe, expect, it } from "vitest";
import { scrapePRContext } from "./prContext";
import type { PRIdentity } from "./diffFetch";

const pr: PRIdentity = { owner: "acme", repo: "app", number: 42 };

function setBody(html: string, title = "Fix bug · Pull Request #42 · acme/app"): void {
  document.title = title;
  document.body.innerHTML = html;
}

afterEach(() => {
  document.body.innerHTML = "";
  document.title = "";
});

describe("scrapePRContext branch refs", () => {
  it("reads classic labeled base-ref / head-ref titles (open Files tab)", () => {
    setBody(`
      <span title="acme/app:main" class="commit-ref base-ref">
        <a title="acme/app:main">main</a>
      </span>
      <span title="alice/app:feature-x" class="commit-ref head-ref">
        <a title="alice/app:feature-x">feature-x</a>
      </span>
    `);

    const ctx = scrapePRContext(pr);
    expect(ctx.baseRef).toBe("main");
    expect(ctx.headRef).toBe("feature-x");
  });

  it("reads base from unlabeled commit-ref title when base-ref class is missing (merged Files tab)", () => {
    // After merge GitHub drops the `base-ref` class (retargeting disabled) but
    // keeps the title attribute. Head still has `head-ref`.
    setBody(`
      <span title="acme/app:main" class="commit-ref css-truncate user-select-contain expandable ">
        <a title="acme/app:main" href="/acme/app/tree/main">main</a>
      </span>
      <span title="acme/app:feature-x" class="commit-ref css-truncate user-select-contain expandable head-ref">
        <a title="acme/app:feature-x" href="/acme/app/tree/feature-x">feature-x</a>
      </span>
    `);

    const ctx = scrapePRContext(pr);
    expect(ctx.baseRef).toBe("main");
    expect(ctx.headRef).toBe("feature-x");
  });

  it("reads nested base-ref text from the merge timeline (merged Conversation)", () => {
    setBody(`
      <span class="commit-ref user-select-contain">
        <span class="base-ref">
          <span class="css-truncate-target">main</span>
        </span>
      </span>
    `);

    const ctx = scrapePRContext(pr);
    expect(ctx.baseRef).toBe("main");
    expect(ctx.headRef).toBe("");
  });

  it("reads React Conversation BranchName chips (into base, from head)", () => {
    setBody(`
      <span>wants to merge 1 commit into</span>
      <a href="/acme/app/tree/main" data-component="BranchName">acme:main</a>
      <span>from</span>
      <a href="/alice/app/tree/feature-x" data-component="BranchName">alice:feature-x</a>
      <!-- duplicate chips elsewhere on the page should not change the pair -->
      <a href="/acme/app/tree/main" data-component="BranchName">acme:main</a>
      <a href="/alice/app/tree/feature-x" data-component="BranchName">alice:feature-x</a>
    `);

    const ctx = scrapePRContext(pr);
    expect(ctx.baseRef).toBe("main");
    expect(ctx.headRef).toBe("feature-x");
  });

  it("returns empty strings when no branch markup is present", () => {
    setBody(`<h1 class="gh-header-title"><bdi class="js-issue-title">Fix bug</bdi></h1>`);

    const ctx = scrapePRContext(pr);
    expect(ctx.baseRef).toBe("");
    expect(ctx.headRef).toBe("");
    expect(ctx.title).toBe("Fix bug");
  });

  it("prefers labeled base-ref over a later unlabeled commit-ref title", () => {
    setBody(`
      <span title="acme/app:develop" class="commit-ref base-ref">develop</span>
      <span title="acme/app:main" class="commit-ref">main</span>
      <span title="acme/app:feature-x" class="commit-ref head-ref">feature-x</span>
    `);

    const ctx = scrapePRContext(pr);
    expect(ctx.baseRef).toBe("develop");
    expect(ctx.headRef).toBe("feature-x");
  });
});

describe("description HTML sanitization", () => {
  function scrapeDescriptionHtml(bodyHtml: string): string {
    setBody(`<div data-testid="issue-body"><div class="markdown-body">${bodyHtml}</div></div>`);
    return scrapePRContext(pr).descriptionHtml;
  }

  it("keeps the markdown GitHub actually renders", () => {
    const html = scrapeDescriptionHtml(
      '<p>Fixes <a href="https://example.com/1">#1</a></p><ul><li><code>x</code></li></ul>',
    );

    expect(html).toContain("<p>");
    expect(html).toContain("<code>x</code>");
    expect(html).toContain('href="https://example.com/1"');
    // Links open away from the review rather than navigating it.
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("drops style, form and inline event handlers", () => {
    const html = scrapeDescriptionHtml(
      "<style>.x{color:red}</style>" +
        '<form action="https://evil.example"><input name="token"></form>' +
        '<p onclick="alert(1)" style="position:fixed">hi</p>',
    );

    expect(html).not.toContain("<style");
    expect(html).not.toContain("<form");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("position:fixed");
    expect(html).toContain("hi");
  });

  it("drops javascript: links and script tags", () => {
    const html = scrapeDescriptionHtml(
      '<script>alert(1)</script><a href="javascript:alert(1)">click</a>',
    );

    expect(html).not.toContain("<script");
    expect(html).not.toContain("javascript:");
  });
});

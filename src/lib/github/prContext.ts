import type { PRContext } from "../types";
import type { PRIdentity } from "./diffFetch";

/**
 * Best-effort scrape of PR title/description/branch refs from the rendered
 * GitHub page. This is *context* for the LLM (to infer intent), never the
 * source of truth for code — that's always the fetched diff. GitHub's DOM
 * changes over time, so every selector here degrades to an empty string
 * rather than throwing.
 */
export function scrapePRContext(pr: PRIdentity): PRContext {
  const title = firstText([
    'bdi.js-issue-title',
    ".js-issue-title",
    'h1[data-testid="issue-title"] bdi',
    "h1.gh-header-title bdi",
  ]);

  const description = firstDescriptionText([
    '[data-testid="issue-body"] .markdown-body',
    ".comment-body.markdown-body",
    "td.comment-body.markdown-body",
  ]);

  const author = firstText([
    ".gh-header-meta .author",
    'a.author[href]',
    'a[data-hovercard-type="user"].author',
  ]);

  const baseRef =
    firstAttr(['.commit-ref.base-ref[title]', '.base-ref[title]'], "title") ||
    firstText([".commit-ref.base-ref", ".base-ref"]);

  const headRef =
    firstAttr(['.commit-ref.head-ref[title]', '.head-ref[title]'], "title") ||
    firstText([".commit-ref.head-ref", ".head-ref"]);

  return {
    owner: pr.owner,
    repo: pr.repo,
    number: pr.number,
    url: window.location.href,
    title: title ?? document.title,
    description: description ?? "",
    author: author ?? "",
    baseRef: normalizeRef(baseRef) ?? "",
    headRef: normalizeRef(headRef) ?? "",
  };
}

function firstText(selectors: string[]): string | undefined {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    const text = el?.textContent?.trim();
    if (text) return text;
  }
  return undefined;
}

/**
 * Like firstText, but skips GitHub's hidden markdown *preview* panes. Every
 * comment form on the page (the "Add a comment" box, inline replies, etc.)
 * renders one as `.comment-body.markdown-body.js-preview-body`, containing
 * the literal placeholder text "Nothing to preview" — which happens to match
 * the same selectors used for the real issue body. Without filtering these
 * out, a page with an empty/collapsed issue-body match can end up "finding"
 * a preview pane instead and reporting that placeholder as the description.
 */
function firstDescriptionText(selectors: string[]): string | undefined {
  for (const selector of selectors) {
    for (const el of document.querySelectorAll(selector)) {
      if (el.classList.contains("js-preview-body")) continue;
      const text = el.textContent?.trim();
      if (text && text !== "Nothing to preview") return text;
    }
  }
  return undefined;
}

function firstAttr(selectors: string[], attr: string): string | undefined {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    const value = el?.getAttribute(attr)?.trim();
    if (value) return value;
  }
  return undefined;
}

/** GitHub often renders refs as "owner:branch" — keep just the branch part. */
function normalizeRef(ref: string | undefined): string | undefined {
  if (!ref) return ref;
  const parts = ref.split(":");
  return parts[parts.length - 1];
}

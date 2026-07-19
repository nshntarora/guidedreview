import DOMPurify from "dompurify";
import type { PRContext } from "../types";
import type { PRIdentity } from "./diffFetch";

// Open links from the PR description in a new tab instead of navigating the
// review away from GitHub, and strip anything DOMPurify's default config
// wouldn't already catch on the `rel` front.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
});

/**
 * Best-effort scrape of PR title/description/branch refs from the rendered
 * GitHub page. This is *context* for the LLM (to infer intent), never the
 * source of truth for code — that's always the fetched diff. GitHub's DOM
 * changes over time, so every selector here degrades to an empty string
 * rather than throwing.
 */
const DESCRIPTION_SELECTORS = [
  '[data-testid="issue-body"] .markdown-body',
  ".comment-body.markdown-body",
  "td.comment-body.markdown-body",
];

export function scrapePRContext(pr: PRIdentity): PRContext {
  const title = firstText([
    'bdi.js-issue-title',
    ".js-issue-title",
    'h1[data-testid="issue-title"] bdi',
    "h1.gh-header-title bdi",
  ]);

  const descriptionEl = firstDescriptionElement(DESCRIPTION_SELECTORS, document);
  const description = descriptionEl?.textContent?.trim();
  const descriptionHtml = descriptionEl && DOMPurify.sanitize(descriptionEl.innerHTML);

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

  // Prefer a scraped title; fall back to document.title only when it looks like
  // a real PR title (GitHub's pattern is "Title · Pull Request #N · owner/repo").
  // Never invent a title from a generic browser tab string.
  const resolvedTitle = title ?? prTitleFromDocumentTitle(document.title) ?? "";

  return {
    owner: pr.owner,
    repo: pr.repo,
    number: pr.number,
    url: window.location.href,
    title: resolvedTitle,
    description: description ?? "",
    descriptionHtml: descriptionHtml ?? "",
    author: author ?? "",
    baseRef: normalizeRef(baseRef) ?? "",
    headRef: normalizeRef(headRef) ?? "",
  };
}

/**
 * Extract the PR title from GitHub's document.title pattern:
 * "Some title · Pull Request #42 · owner/repo". Returns undefined when the
 * tab title doesn't match (e.g. still loading, or a non-PR page).
 */
function prTitleFromDocumentTitle(docTitle: string): string | undefined {
  const match = docTitle.match(/^(.*?)\s*·\s*Pull Request\s*#\d+/i);
  const extracted = match?.[1]?.trim();
  return extracted || undefined;
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
 *
 * Takes an explicit root because the description is only rendered on GitHub's
 * "Conversation" tab — see fetchConversationDescription below for the tabs
 * (Files changed, Commits, ...) where it has to be parsed out of a separately
 * fetched document instead of the live `document`.
 */
function firstDescriptionElement(selectors: string[], root: ParentNode): Element | undefined {
  for (const selector of selectors) {
    for (const el of root.querySelectorAll(selector)) {
      if (el.classList.contains("js-preview-body")) continue;
      const text = el.textContent?.trim();
      if (text && text !== "Nothing to preview") return el;
    }
  }
  return undefined;
}

/**
 * The PR description only lives in the DOM on the "Conversation" tab — GitHub
 * doesn't render the issue-body timeline on "Files changed"/"Commits"/etc, so
 * scrapePRContext() correctly returns "" for description there. As a
 * best-effort fallback (used when the live scrape comes back empty), fetch
 * the Conversation tab's HTML directly — it's the same origin as the current
 * page, so no CORS/background-worker hop is needed like fetchPRDiff requires
 * — and parse the description out of that instead.
 */
export async function fetchConversationDescription(
  pr: PRIdentity
): Promise<{ text: string; html: string }> {
  const empty = { text: "", html: "" };
  const url = `https://github.com/${pr.owner}/${pr.repo}/pull/${pr.number}`;

  let response: Response;
  try {
    response = await fetch(url, { credentials: "include", headers: { Accept: "text/html" } });
  } catch {
    return empty;
  }
  if (!response.ok) return empty;

  const html = await response.text();
  const conversationDoc = new DOMParser().parseFromString(html, "text/html");
  const el = firstDescriptionElement(DESCRIPTION_SELECTORS, conversationDoc);
  if (!el) return empty;
  return { text: el.textContent?.trim() ?? "", html: DOMPurify.sanitize(el.innerHTML) };
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

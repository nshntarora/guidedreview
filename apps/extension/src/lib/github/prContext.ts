import DOMPurify, { type Config } from "dompurify";
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
 * Explicit allowlist for the PR description, which is authored by whoever
 * opened the pull request and ends up in `dangerouslySetInnerHTML`.
 *
 * GitHub has already sanitized this HTML before we scrape it, so this is the
 * second line: it covers what GitHub's markdown renderer emits and nothing
 * else. Notably absent are `style` and `form` — with the overlay rendered
 * inside a shadow root on the PR page, either one would let a description
 * restyle the review UI or put a convincing fake input in front of the user if
 * a gap ever opened upstream.
 */
const DESCRIPTION_SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    "a",
    "b",
    "blockquote",
    "br",
    "code",
    "del",
    "details",
    "div",
    "em",
    "g-emoji",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "i",
    "img",
    "input",
    "kbd",
    "li",
    "ol",
    "p",
    "picture",
    "pre",
    "q",
    "s",
    "samp",
    "source",
    "span",
    "strong",
    "sub",
    "summary",
    "sup",
    "table",
    "tbody",
    "td",
    "tfoot",
    "th",
    "thead",
    "tr",
    "ul",
    "var",
  ],
  ALLOWED_ATTR: [
    "align",
    "alt",
    "checked",
    "class",
    "colspan",
    "disabled",
    "height",
    "href",
    "id",
    "loading",
    "media",
    "rel",
    "rowspan",
    "span",
    "src",
    "srcset",
    "start",
    "target",
    "title",
    "type",
    "width",
  ],
  // Belt and braces alongside the tag allowlist.
  FORBID_TAGS: ["style", "form", "script", "iframe", "object", "embed"],
  FORBID_ATTR: ["style", "srcdoc", "formaction", "ping"],
} satisfies Config;

/** Sanitize author-controlled description HTML for `dangerouslySetInnerHTML`. */
function sanitizeDescriptionHtml(html: string): string {
  return DOMPurify.sanitize(html, DESCRIPTION_SANITIZE_CONFIG);
}

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
    "bdi.js-issue-title",
    ".js-issue-title",
    'h1[data-testid="issue-title"] bdi',
    "h1.gh-header-title bdi",
  ]);

  const descriptionEl = firstDescriptionElement(DESCRIPTION_SELECTORS, document);
  const description = descriptionEl?.textContent?.trim();
  const descriptionHtml = descriptionEl && sanitizeDescriptionHtml(descriptionEl.innerHTML);

  const author = firstText([
    ".gh-header-meta .author",
    "a.author[href]",
    'a[data-hovercard-type="user"].author',
  ]);

  const { baseRef, headRef } = scrapeBranchRefs(document);

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
    baseRef,
    headRef,
  };
}

/**
 * Resolve base/head branch names from GitHub's PR header DOM. GitHub uses
 * several layouts depending on open vs merged and Conversation vs Files:
 *
 * 1. Classic labeled `.commit-ref.base-ref` / `.head-ref` (open Files tab)
 * 2. Unlabeled `.commit-ref[title]` for base after merge (merged Files tab
 *    drops the `base-ref` class because retargeting is disabled)
 * 3. React Conversation chips: `a[data-component="BranchName"]` in
 *    into-base / from-head order
 *
 * Each strategy only fills gaps left by earlier ones; missing refs stay "".
 */
function scrapeBranchRefs(root: ParentNode): { baseRef: string; headRef: string } {
  let baseRef =
    firstAttrIn(root, [".commit-ref.base-ref[title]", ".base-ref[title]"], "title") ||
    firstTextIn(root, [".commit-ref.base-ref", ".base-ref"]);

  let headRef =
    firstAttrIn(root, [".commit-ref.head-ref[title]", ".head-ref[title]"], "title") ||
    firstTextIn(root, [".commit-ref.head-ref", ".head-ref"]);

  if (!baseRef || !headRef) {
    const fromTitles = branchRefsFromCommitRefTitles(root);
    baseRef = baseRef || fromTitles.baseRef;
    headRef = headRef || fromTitles.headRef;
  }

  if (!baseRef || !headRef) {
    const fromChips = branchRefsFromBranchNameChips(root);
    baseRef = baseRef || fromChips.baseRef;
    headRef = headRef || fromChips.headRef;
  }

  return {
    baseRef: normalizeRef(baseRef) ?? "",
    headRef: normalizeRef(headRef) ?? "",
  };
}

/**
 * On merged PRs' Files tab, the base branch is still a `.commit-ref` with a
 * `title="owner/repo:branch"` attribute, but without the `base-ref` class.
 * Head usually still has `.head-ref`. Collect titled commit-refs and assign
 * by class when present, otherwise treat the non-head one as base.
 */
function branchRefsFromCommitRefTitles(root: ParentNode): {
  baseRef?: string;
  headRef?: string;
} {
  const entries: { title: string; isBase: boolean; isHead: boolean }[] = [];
  for (const el of root.querySelectorAll(".commit-ref[title]")) {
    const title = el.getAttribute("title")?.trim();
    if (!title) continue;
    entries.push({
      title,
      isBase: el.classList.contains("base-ref"),
      isHead: el.classList.contains("head-ref"),
    });
  }
  if (entries.length === 0) return {};

  const labeledBase = entries.find((e) => e.isBase)?.title;
  const labeledHead = entries.find((e) => e.isHead)?.title;
  const unlabeled = entries.filter((e) => !e.isBase && !e.isHead);

  let baseRef = labeledBase;
  let headRef = labeledHead;

  // Merged Files: base lost its class but head kept `head-ref`.
  if (!baseRef) {
    baseRef = unlabeled[0]?.title;
  }
  if (!headRef) {
    headRef =
      unlabeled.find((e) => e.title !== baseRef)?.title ??
      entries.find((e) => e.title !== baseRef)?.title;
  }

  return { baseRef, headRef };
}

/**
 * New Conversation-tab header renders "into &lt;base&gt; from &lt;head&gt;" as
 * Primer BranchName links. Take the first two unique chip texts.
 */
function branchRefsFromBranchNameChips(root: ParentNode): {
  baseRef?: string;
  headRef?: string;
} {
  const texts: string[] = [];
  for (const el of root.querySelectorAll('a[data-component="BranchName"]')) {
    const text = el.textContent?.trim();
    if (!text) continue;
    if (texts.includes(text)) continue;
    texts.push(text);
    if (texts.length >= 2) break;
  }
  if (texts.length === 0) return {};
  return { baseRef: texts[0], headRef: texts[1] };
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
  return firstTextIn(document, selectors);
}

function firstTextIn(root: ParentNode, selectors: string[]): string | undefined {
  for (const selector of selectors) {
    const el = root.querySelector(selector);
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
  pr: PRIdentity,
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
  return { text: el.textContent?.trim() ?? "", html: sanitizeDescriptionHtml(el.innerHTML) };
}

function firstAttrIn(root: ParentNode, selectors: string[], attr: string): string | undefined {
  for (const selector of selectors) {
    const el = root.querySelector(selector);
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

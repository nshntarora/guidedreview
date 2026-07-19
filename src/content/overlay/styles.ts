/**
 * Plain CSS injected as a <style> tag inside the overlay's Shadow DOM root.
 * Shadow DOM already isolates this from GitHub's page styles (and vice
 * versa), so there's no need for CSS modules / a styling library here —
 * that isolation is the whole point of using Shadow DOM in the first place.
 */
export const OVERLAY_CSS = `
:host {
  all: initial;
}

* {
  box-sizing: border-box;
}

.gr-root {
  /* Brand surface hierarchy (matches options page dark theme):
     chrome (darkest brand bg) < bg < canvas (lifted, code lives here) < subtle */
  --gr-bg-chrome: #0d0806;
  --gr-bg: #110e0b;
  --gr-bg-canvas: #16120f;
  --gr-bg-subtle: #1c1814;
  --gr-border: #2a2420;
  --gr-border-muted: #211c18;
  --gr-text: #fefefe;
  --gr-text-muted: #8b949e;
  --gr-text-faint: #6e7781;
  --gr-accent: #caff57;
  --gr-accent-on: #0d0806;
  --gr-accent-subtle: #1a2408;
  --gr-danger: #ff7b72;
  --gr-danger-subtle: #3d0f0f;
  --gr-add-bg: #0f2c1d;
  --gr-add-text: #56d364;
  --gr-del-bg: #2d1416;
  --gr-del-text: #ff7b72;

  /* GitHub github-dark syntax palette */
  --gr-syntax-comment: #8b949e;
  --gr-syntax-keyword: #ff7b72;
  --gr-syntax-entity: #d2a8ff;
  --gr-syntax-string: #a5d6ff;
  --gr-syntax-variable: #ffa657;
  --gr-syntax-constant: #79c0ff;
  --gr-syntax-tag: #7ee787;
  --gr-syntax-attr: #79c0ff;
  --gr-syntax-meta: #8b949e;
  --gr-syntax-deleted: #ffdcd7;
  --gr-syntax-inserted: #aff5b4;

  color-scheme: dark;
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  background: var(--gr-bg);
  color: var(--gr-text);
  /* system-ui → SF Pro on macOS; antialiased for native-looking dark UI */
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  display: flex;
  flex-direction: column;
}

.gr-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--gr-border);
  background: var(--gr-bg-chrome);
  flex-shrink: 0;
}

.gr-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.gr-header-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  flex: 1;
}

.gr-header-logomark {
  width: 32px;
  height: 16px;
  flex-shrink: 0;
  display: block;
}

.gr-header-titles {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.gr-header-identity {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.gr-header-pr-title {
  font-weight: 600;
  font-size: 15px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gr-header-pr-number {
  color: var(--gr-text-muted);
  font-size: 13px;
  flex-shrink: 0;
}

.gr-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.gr-header-progress {
  color: var(--gr-text-muted);
  font-size: 13px;
}

.gr-header-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12.5px;
  color: var(--gr-text-muted);
}

.gr-author {
  color: var(--gr-text-muted);
}

.gr-branch-chip {
  display: inline-block;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  background: var(--gr-bg);
  border: 1px solid var(--gr-border);
  border-radius: 999px;
  padding: 1px 10px;
  color: var(--gr-text);
}

.gr-exit-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--gr-border);
  background: var(--gr-bg);
  color: var(--gr-text);
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 13px;
  cursor: pointer;
}

.gr-exit-btn:hover {
  background: var(--gr-bg-subtle);
}

.gr-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 4px;
  border: 1px solid var(--gr-border);
  border-bottom-width: 2px;
  background: var(--gr-bg-subtle);
  color: var(--gr-text-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  line-height: 1;
}

.gr-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.gr-sidebar {
  flex: 1 1 50%;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 0 0;
  margin-top: 24px;
  border-top: 1px solid var(--gr-border-muted);
}

.gr-sidebar-section-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--gr-text-muted);
  padding: 10px 8px 4px;
}

.gr-unit-item {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  color: var(--gr-text);
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 2px;
  cursor: pointer;
  font-size: 13px;
  line-height: 1.4;
}

.gr-unit-item:hover {
  background: var(--gr-bg-subtle);
}

.gr-unit-item.gr-active {
  background: var(--gr-accent-subtle);
  color: var(--gr-accent);
  font-weight: 600;
}

.gr-unit-item-index {
  color: var(--gr-text-muted);
  margin-right: 6px;
}

.gr-unit-item-skeleton {
  display: flex;
  align-items: center;
  padding: 10px 8px;
  margin-bottom: 2px;
  pointer-events: none;
}

.gr-unit-item-skeleton-bar {
  display: block;
  height: 12px;
  width: 72%;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    var(--gr-bg-subtle) 0%,
    var(--gr-border-muted) 50%,
    var(--gr-bg-subtle) 100%
  );
  background-size: 200% 100%;
  animation: gr-skeleton-pulse 1.2s ease-in-out infinite;
}

.gr-unit-item-skeleton:nth-child(3) .gr-unit-item-skeleton-bar { width: 58%; }
.gr-unit-item-skeleton:nth-child(4) .gr-unit-item-skeleton-bar { width: 80%; }
.gr-unit-item-skeleton:nth-child(5) .gr-unit-item-skeleton-bar { width: 45%; }
.gr-unit-item-skeleton:nth-child(6) .gr-unit-item-skeleton-bar { width: 66%; }

@keyframes gr-skeleton-pulse {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

.gr-code-col {
  flex: 1 1 68%;
  min-width: 0;
  overflow-y: auto;
  padding: 24px 32px;
  background: var(--gr-bg);
  border-right: 1px solid var(--gr-border);
}

.gr-review-col {
  display: flex;
  flex-direction: column;
  flex: 1 1 32%;
  min-width: 300px;
  max-width: 420px;
  overflow: hidden;
  padding: 24px 20px;
  background: var(--gr-bg-chrome);
}

.gr-context-pane {
  flex: 1 1 50%;
  min-height: 0;
  overflow-y: auto;
}

.gr-pr-stats {
  color: var(--gr-text-muted);
}

.gr-stat-add {
  color: var(--gr-add-text);
  margin-left: 4px;
}

.gr-stat-del {
  color: var(--gr-del-text);
  margin-left: 4px;
}

.gr-description-pane {
  width: 100%;
  max-width: 100%;
}

.gr-description-pane--with-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 28px 32px;
  align-items: start;
  /* Sit the changes column next to the description, not pinned to the far edge. */
  justify-content: flex-start;
}

.gr-description-pane-main {
  flex: 0 1 720px;
  min-width: 0;
  max-width: 720px;
}

.gr-description-pane-title {
  margin: 0 0 20px;
  font-size: 1.375rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.3;
  color: var(--gr-text);
}

.gr-description-pane-body {
  font-size: 0.9375rem;
  line-height: 1.7;
  word-break: break-word;
  color: var(--gr-text);
}

.gr-description-pane-body:not(.markdown-body) {
  white-space: pre-wrap;
}

.gr-description-pane-empty {
  margin: 0;
  color: var(--gr-text-muted);
  font-size: 0.9375rem;
  line-height: 1.6;
}

/* ── Markdown body (scraped GitHub PR description HTML) ─────────────── */
/* GitHub ships prettylights (.pl-*) on fenced code; Shadow DOM isolates us
   from page CSS, so we restyle every common markdown element here. */

.gr-description-pane-body.markdown-body > *:first-child {
  margin-top: 0 !important;
}

.gr-description-pane-body.markdown-body > *:last-child {
  margin-bottom: 0 !important;
}

.gr-description-pane-body.markdown-body h1,
.gr-description-pane-body.markdown-body h2,
.gr-description-pane-body.markdown-body h3,
.gr-description-pane-body.markdown-body h4,
.gr-description-pane-body.markdown-body h5,
.gr-description-pane-body.markdown-body h6 {
  margin-top: 1.5em;
  margin-bottom: 0.6em;
  font-weight: 600;
  line-height: 1.3;
  color: var(--gr-text);
}

.gr-description-pane-body.markdown-body h1 {
  font-size: 1.75em;
  letter-spacing: -0.02em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--gr-border);
}

.gr-description-pane-body.markdown-body h2 {
  font-size: 1.4em;
  letter-spacing: -0.015em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--gr-border);
}

.gr-description-pane-body.markdown-body h3 {
  font-size: 1.2em;
}

.gr-description-pane-body.markdown-body h4 {
  font-size: 1.05em;
}

.gr-description-pane-body.markdown-body h5 {
  font-size: 0.95em;
}

.gr-description-pane-body.markdown-body h6 {
  font-size: 0.875em;
  color: var(--gr-text-muted);
}

.gr-description-pane-body.markdown-body p,
.gr-description-pane-body.markdown-body blockquote,
.gr-description-pane-body.markdown-body ul,
.gr-description-pane-body.markdown-body ol,
.gr-description-pane-body.markdown-body dl,
.gr-description-pane-body.markdown-body table,
.gr-description-pane-body.markdown-body pre,
.gr-description-pane-body.markdown-body details,
.gr-description-pane-body.markdown-body .highlight {
  margin-top: 0;
  margin-bottom: 1em;
}

.gr-description-pane-body.markdown-body p {
  margin-bottom: 1em;
}

.gr-description-pane-body.markdown-body a {
  color: var(--gr-accent);
  text-decoration: none;
}

.gr-description-pane-body.markdown-body a:hover {
  text-decoration: underline;
  text-underline-offset: 0.15em;
}

.gr-description-pane-body.markdown-body a:not([href]) {
  color: inherit;
  text-decoration: none;
}

.gr-description-pane-body.markdown-body strong,
.gr-description-pane-body.markdown-body b {
  font-weight: 600;
  color: var(--gr-text);
}

.gr-description-pane-body.markdown-body em,
.gr-description-pane-body.markdown-body i {
  font-style: italic;
}

.gr-description-pane-body.markdown-body del {
  text-decoration: line-through;
  color: var(--gr-text-muted);
}

.gr-description-pane-body.markdown-body mark {
  background: color-mix(in srgb, var(--gr-accent) 22%, transparent);
  color: var(--gr-text);
  border-radius: 2px;
  padding: 0.05em 0.2em;
}

.gr-description-pane-body.markdown-body img {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  background: transparent;
}

.gr-description-pane-body.markdown-body hr {
  height: 0.2em;
  padding: 0;
  margin: 1.5em 0;
  background: var(--gr-border);
  border: 0;
  border-radius: 1px;
}

.gr-description-pane-body.markdown-body ul,
.gr-description-pane-body.markdown-body ol {
  padding-left: 2em;
}

.gr-description-pane-body.markdown-body ul ul,
.gr-description-pane-body.markdown-body ul ol,
.gr-description-pane-body.markdown-body ol ol,
.gr-description-pane-body.markdown-body ol ul {
  margin-top: 0;
  margin-bottom: 0;
}

.gr-description-pane-body.markdown-body ol ol {
  list-style-type: lower-roman;
}

.gr-description-pane-body.markdown-body ul ul ol,
.gr-description-pane-body.markdown-body ul ol ol,
.gr-description-pane-body.markdown-body ol ul ol,
.gr-description-pane-body.markdown-body ol ol ol {
  list-style-type: lower-alpha;
}

.gr-description-pane-body.markdown-body li + li {
  margin-top: 0.3em;
}

.gr-description-pane-body.markdown-body li > p {
  margin-top: 0.75em;
  margin-bottom: 0.75em;
}

.gr-description-pane-body.markdown-body li > p:first-child {
  margin-top: 0;
}

.gr-description-pane-body.markdown-body .task-list-item {
  list-style-type: none;
}

.gr-description-pane-body.markdown-body .task-list-item-checkbox {
  margin: 0 0.4em 0.2em -1.4em;
  vertical-align: middle;
  accent-color: var(--gr-accent);
}

.gr-description-pane-body.markdown-body blockquote {
  margin: 0 0 1em;
  padding: 0 1em;
  color: var(--gr-text-muted);
  border-left: 0.25em solid var(--gr-border);
}

.gr-description-pane-body.markdown-body blockquote > :first-child {
  margin-top: 0;
}

.gr-description-pane-body.markdown-body blockquote > :last-child {
  margin-bottom: 0;
}

.gr-description-pane-body.markdown-body code,
.gr-description-pane-body.markdown-body tt,
.gr-description-pane-body.markdown-body samp {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 0.875em;
}

.gr-description-pane-body.markdown-body code,
.gr-description-pane-body.markdown-body tt {
  padding: 0.2em 0.4em;
  margin: 0;
  white-space: break-spaces;
  background: color-mix(in srgb, var(--gr-text) 10%, transparent);
  border-radius: 6px;
}

.gr-description-pane-body.markdown-body h1 code,
.gr-description-pane-body.markdown-body h2 code,
.gr-description-pane-body.markdown-body h3 code,
.gr-description-pane-body.markdown-body h4 code,
.gr-description-pane-body.markdown-body h5 code,
.gr-description-pane-body.markdown-body h6 code {
  font-size: inherit;
  padding: 0.1em 0.3em;
}

.gr-description-pane-body.markdown-body pre {
  padding: 1em;
  overflow-x: auto;
  font-size: 0.875em;
  line-height: 1.5;
  color: var(--gr-text);
  background: var(--gr-bg-canvas);
  border: 1px solid var(--gr-border-muted);
  border-radius: 8px;
  word-wrap: normal;
}

.gr-description-pane-body.markdown-body .highlight {
  margin-bottom: 1em;
}

.gr-description-pane-body.markdown-body .highlight pre {
  margin-bottom: 0;
  word-break: normal;
}

.gr-description-pane-body.markdown-body pre code,
.gr-description-pane-body.markdown-body pre tt {
  display: inline;
  padding: 0;
  margin: 0;
  overflow: visible;
  line-height: inherit;
  word-wrap: normal;
  white-space: pre;
  background: transparent;
  border: 0;
  font-size: 100%;
  border-radius: 0;
}

.gr-description-pane-body.markdown-body kbd {
  display: inline-block;
  padding: 0.2em 0.4em;
  font: 0.75em ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  line-height: 1.1;
  color: var(--gr-text);
  vertical-align: middle;
  background: var(--gr-bg-subtle);
  border: 1px solid var(--gr-border);
  border-bottom-color: var(--gr-border);
  border-radius: 6px;
  box-shadow: inset 0 -1px 0 var(--gr-border);
}

.gr-description-pane-body.markdown-body table {
  display: block;
  width: max-content;
  max-width: 100%;
  overflow: auto;
  border-spacing: 0;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}

.gr-description-pane-body.markdown-body table th {
  font-weight: 600;
}

.gr-description-pane-body.markdown-body table th,
.gr-description-pane-body.markdown-body table td {
  padding: 7px 13px;
  border: 1px solid var(--gr-border);
}

.gr-description-pane-body.markdown-body table tr {
  background: var(--gr-bg);
  border-top: 1px solid var(--gr-border);
}

.gr-description-pane-body.markdown-body table tr:nth-child(2n) {
  background: var(--gr-bg-subtle);
}

.gr-description-pane-body.markdown-body table td > :last-child {
  margin-bottom: 0;
}

.gr-description-pane-body.markdown-body dl {
  padding: 0;
}

.gr-description-pane-body.markdown-body dl dt {
  padding: 0;
  margin-top: 1em;
  font-size: 1em;
  font-style: italic;
  font-weight: 600;
}

.gr-description-pane-body.markdown-body dl dd {
  padding: 0 1em;
  margin-bottom: 1em;
  margin-left: 0;
}

.gr-description-pane-body.markdown-body details {
  margin-bottom: 1em;
}

.gr-description-pane-body.markdown-body details summary {
  cursor: pointer;
  font-weight: 600;
}

.gr-description-pane-body.markdown-body .markdown-alert {
  padding: 0.6em 1em;
  margin-bottom: 1em;
  color: inherit;
  border-left: 0.25em solid var(--gr-border);
  border-radius: 0 6px 6px 0;
  background: var(--gr-bg-subtle);
}

.gr-description-pane-body.markdown-body .markdown-alert > :first-child {
  margin-top: 0;
}

.gr-description-pane-body.markdown-body .markdown-alert > :last-child {
  margin-bottom: 0;
}

.gr-description-pane-body.markdown-body .markdown-alert .markdown-alert-title {
  display: flex;
  align-items: center;
  gap: 0.4em;
  font-weight: 600;
  line-height: 1.25;
  margin-bottom: 0.4em;
}

.gr-description-pane-body.markdown-body .markdown-alert-note {
  border-left-color: #4493f8;
}

.gr-description-pane-body.markdown-body .markdown-alert-note .markdown-alert-title {
  color: #4493f8;
}

.gr-description-pane-body.markdown-body .markdown-alert-tip {
  border-left-color: var(--gr-add-text);
}

.gr-description-pane-body.markdown-body .markdown-alert-tip .markdown-alert-title {
  color: var(--gr-add-text);
}

.gr-description-pane-body.markdown-body .markdown-alert-important {
  border-left-color: #ab7df8;
}

.gr-description-pane-body.markdown-body .markdown-alert-important .markdown-alert-title {
  color: #ab7df8;
}

.gr-description-pane-body.markdown-body .markdown-alert-warning {
  border-left-color: #d29922;
}

.gr-description-pane-body.markdown-body .markdown-alert-warning .markdown-alert-title {
  color: #d29922;
}

.gr-description-pane-body.markdown-body .markdown-alert-caution {
  border-left-color: var(--gr-danger);
}

.gr-description-pane-body.markdown-body .markdown-alert-caution .markdown-alert-title {
  color: var(--gr-danger);
}

/* GitHub prettylights (scraped fenced-code spans) */
.gr-description-pane-body.markdown-body .pl-c {
  color: var(--gr-syntax-comment);
  font-style: italic;
}

.gr-description-pane-body.markdown-body .pl-c1,
.gr-description-pane-body.markdown-body .pl-s .pl-v {
  color: var(--gr-syntax-constant);
}

.gr-description-pane-body.markdown-body .pl-e,
.gr-description-pane-body.markdown-body .pl-en {
  color: var(--gr-syntax-entity);
}

.gr-description-pane-body.markdown-body .pl-smi,
.gr-description-pane-body.markdown-body .pl-s .pl-s1 {
  color: var(--gr-text);
}

.gr-description-pane-body.markdown-body .pl-ent {
  color: var(--gr-syntax-tag);
}

.gr-description-pane-body.markdown-body .pl-k {
  color: var(--gr-syntax-keyword);
}

.gr-description-pane-body.markdown-body .pl-s,
.gr-description-pane-body.markdown-body .pl-pds,
.gr-description-pane-body.markdown-body .pl-s .pl-pse .pl-s1,
.gr-description-pane-body.markdown-body .pl-sr,
.gr-description-pane-body.markdown-body .pl-sr .pl-cce,
.gr-description-pane-body.markdown-body .pl-sr .pl-sre,
.gr-description-pane-body.markdown-body .pl-sr .pl-sra {
  color: var(--gr-syntax-string);
}

.gr-description-pane-body.markdown-body .pl-v,
.gr-description-pane-body.markdown-body .pl-smw {
  color: var(--gr-syntax-variable);
}

.gr-description-pane-body.markdown-body .pl-bu {
  color: var(--gr-danger);
}

.gr-description-pane-body.markdown-body .pl-ii {
  color: var(--gr-text);
  background-color: var(--gr-danger-subtle);
}

.gr-description-pane-body.markdown-body .pl-c2 {
  color: var(--gr-text);
  background-color: #b62324;
}

.gr-description-pane-body.markdown-body .pl-sr .pl-cce {
  font-weight: 600;
  color: var(--gr-syntax-tag);
}

.gr-description-pane-body.markdown-body .pl-ml {
  color: #f2cc60;
}

.gr-description-pane-body.markdown-body .pl-mh,
.gr-description-pane-body.markdown-body .pl-mh .pl-en,
.gr-description-pane-body.markdown-body .pl-ms {
  font-weight: 600;
  color: #79c0ff;
}

.gr-description-pane-body.markdown-body .pl-mi {
  font-style: italic;
  color: var(--gr-text);
}

.gr-description-pane-body.markdown-body .pl-mb {
  font-weight: 600;
  color: var(--gr-text);
}

.gr-description-pane-body.markdown-body .pl-md {
  color: var(--gr-syntax-deleted);
  background-color: var(--gr-del-bg);
}

.gr-description-pane-body.markdown-body .pl-mi1 {
  color: var(--gr-syntax-inserted);
  background-color: var(--gr-add-bg);
}

.gr-description-pane-body.markdown-body .pl-mc {
  color: #ffdfb6;
  background-color: #5a1e02;
}

.gr-description-pane-body.markdown-body .pl-mi2 {
  color: var(--gr-text);
  background-color: #1158c7;
}

.gr-description-pane-body.markdown-body .pl-mdr {
  font-weight: 600;
  color: var(--gr-syntax-entity);
}

.gr-description-pane-body.markdown-body .pl-ba {
  color: var(--gr-text-muted);
}

.gr-description-pane-body.markdown-body .pl-sg {
  color: var(--gr-border);
}

.gr-description-pane-body.markdown-body .pl-corl {
  text-decoration: underline;
  color: var(--gr-syntax-string);
}

/* Hide GitHub clipboard / anchor chrome that doesn't belong in the overlay */
.gr-description-pane-body.markdown-body .zeroclipboard-container,
.gr-description-pane-body.markdown-body .clipboard-copy,
.gr-description-pane-body.markdown-body .anchor,
.gr-description-pane-body.markdown-body a.heading-link {
  display: none !important;
}

.gr-diff-summary {
  flex: 0 1 360px;
  width: 100%;
  max-width: 400px;
  min-width: min(100%, 260px);
  margin-left: 0;
  padding: 0 0 0 24px;
  border: none;
  border-left: 1px solid var(--gr-border);
  border-radius: 0;
  background: transparent;
}

.gr-diff-summary-title {
  margin: 0 0 10px;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--gr-text);
}

.gr-diff-summary-totals {
  margin: 0 0 14px;
  font-size: 0.9375rem;
  font-variant-numeric: tabular-nums;
  color: var(--gr-text-muted);
}

.gr-diff-summary-totals .gr-stat-add,
.gr-diff-summary-totals .gr-stat-del {
  margin-left: 0;
  margin-right: 8px;
  font-weight: 600;
}

.gr-diff-summary-file-count {
  color: var(--gr-text-muted);
}

.gr-diff-summary-files {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.gr-diff-summary-file {
  display: grid;
  grid-template-columns: 1.25rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}

.gr-diff-summary-file:hover {
  background: var(--gr-bg-subtle);
}

.gr-diff-summary-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
  flex-shrink: 0;
}

.gr-diff-summary-status--added {
  color: var(--gr-add-text);
  background: var(--gr-add-bg);
}

.gr-diff-summary-status--modified {
  color: var(--gr-text-muted);
  background: var(--gr-bg-subtle);
}

.gr-diff-summary-status--removed {
  color: var(--gr-del-text);
  background: var(--gr-del-bg);
}

.gr-diff-summary-status--renamed {
  color: var(--gr-syntax-entity);
  background: var(--gr-bg-subtle);
}

.gr-diff-summary-path {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--gr-text);
}

.gr-diff-summary-counts {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  min-width: 4.5rem;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  text-align: right;
}

.gr-diff-summary-counts .gr-stat-add,
.gr-diff-summary-counts .gr-stat-del {
  margin-left: 0;
  font-weight: 500;
}

.gr-diff-summary-binary,
.gr-diff-summary-unchanged {
  color: var(--gr-text-faint);
  font-size: 0.8125rem;
}

.gr-context-panel {
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 2px 0 4px;
}

.gr-context-panel-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--gr-text-muted);
  margin-bottom: 8px;
}

.gr-context-panel-body {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--gr-text);
}

.gr-context-panel-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 16px 0 0;
  padding: 12px 0 0;
  border-top: 1px solid var(--gr-border-muted);
}

.gr-context-panel-loading-text {
  margin: 0;
  font-size: 13px;
  color: var(--gr-text-muted);
}

.gr-keyboard-shortcuts {
  margin: 16px 0 0;
  padding: 12px 0 0;
  border-top: 1px solid var(--gr-border-muted);
}

.gr-keyboard-shortcuts-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gr-keyboard-shortcuts-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: var(--gr-text-muted);
}

.gr-keyboard-shortcuts-keys {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  min-width: 52px;
}

.gr-keyboard-shortcuts-desc {
  color: var(--gr-text-muted);
}

.gr-file-block {
  margin-bottom: 28px;
  border: 1px solid var(--gr-border);
  border-radius: 8px;
  background: var(--gr-bg-canvas);
  overflow: hidden;
}

.gr-file-block-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  background: var(--gr-bg-chrome);
  padding: 8px 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px;
  border-bottom: 1px solid var(--gr-border);
}

.gr-file-block-header-note {
  color: var(--gr-text-muted);
  font-weight: 400;
  font-style: italic;
}

.gr-diff-hunk {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
}

.gr-diff-line {
  display: flex;
  white-space: pre;
  padding: 0 12px 0 0;
}

.gr-diff-line.gr-add {
  background: var(--gr-add-bg);
}

.gr-diff-line.gr-add > .gr-diff-marker {
  color: var(--gr-add-text);
}

.gr-diff-line.gr-del {
  background: var(--gr-del-bg);
}

.gr-diff-line.gr-del > .gr-diff-marker {
  color: var(--gr-del-text);
}

.gr-diff-gutter {
  width: 40px;
  flex-shrink: 0;
  text-align: right;
  padding-right: 12px;
  color: var(--gr-text-faint);
  user-select: none;
  -webkit-user-select: none;
}

.gr-diff-marker {
  width: 16px;
  flex-shrink: 0;
  opacity: 0.7;
}

/* highlight.js token colors, mapped to GitHub's syntax palette */
.hljs-comment,
.hljs-quote {
  color: var(--gr-syntax-comment);
  font-style: italic;
}

.hljs-keyword,
.hljs-selector-tag,
.hljs-subst,
.hljs-operator {
  color: var(--gr-syntax-keyword);
}

.hljs-title,
.hljs-title.function_,
.hljs-title.class_,
.hljs-section,
.hljs-selector-class,
.hljs-selector-id,
.hljs-doctag {
  color: var(--gr-syntax-entity);
}

.hljs-string,
.hljs-regexp,
.hljs-symbol,
.hljs-bullet,
.hljs-link {
  color: var(--gr-syntax-string);
}

.hljs-variable,
.hljs-template-variable,
.hljs-selector-attr,
.hljs-selector-pseudo,
.hljs-attr {
  color: var(--gr-syntax-variable);
}

.hljs-number,
.hljs-literal,
.hljs-type,
.hljs-built_in,
.hljs-class .hljs-title {
  color: var(--gr-syntax-constant);
}

.hljs-tag,
.hljs-name {
  color: var(--gr-syntax-tag);
}

.hljs-attribute {
  color: var(--gr-syntax-attr);
}

.hljs-meta,
.hljs-meta .hljs-keyword {
  color: var(--gr-syntax-meta);
}

.hljs-deletion {
  color: var(--gr-syntax-deleted);
}

.hljs-addition {
  color: var(--gr-syntax-inserted);
}

.hljs-emphasis {
  font-style: italic;
}

.hljs-strong {
  font-weight: 600;
}

.gr-footer-nav {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid var(--gr-border);
  background: var(--gr-bg-chrome);
  padding: 12px 20px;
  flex-shrink: 0;
}

.gr-nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--gr-accent);
  background: var(--gr-accent);
  color: var(--gr-accent-on);
  border-radius: 6px;
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.gr-nav-btn .gr-kbd {
  border-color: rgba(13, 8, 6, 0.25);
  background: rgba(13, 8, 6, 0.08);
  color: inherit;
}

.gr-nav-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.gr-nav-btn.gr-secondary {
  border-color: var(--gr-border);
  background: var(--gr-bg);
  color: var(--gr-text);
}

.gr-centered {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: var(--gr-text-muted);
  text-align: center;
  padding: 24px;
}

.gr-error {
  align-items: stretch;
  max-width: 100%;
}

.gr-error-block {
  margin: 0;
  padding: 12px 14px;
  border-radius: 6px;
  border: 1px solid var(--gr-danger);
  background: var(--gr-danger-subtle);
  color: var(--gr-danger);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12.5px;
  line-height: 1.5;
  text-align: left;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: auto;
  max-height: 40vh;
  overflow-y: auto;
}

.gr-spinner {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 3px solid var(--gr-border);
  border-top-color: var(--gr-accent);
  animation: gr-spin 0.8s linear infinite;
}

@keyframes gr-spin {
  to { transform: rotate(360deg); }
}
`;

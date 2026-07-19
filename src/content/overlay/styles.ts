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
  /* Dark-only surface hierarchy: chrome (darkest) < bg < canvas (lifted, code lives here) */
  --gr-bg-chrome: #0a0c10;
  --gr-bg: #0d1117;
  --gr-bg-canvas: #12161f;
  --gr-bg-subtle: #161b22;
  --gr-border: #262c36;
  --gr-border-muted: #1c222b;
  --gr-text: #e6edf3;
  --gr-text-muted: #8b949e;
  --gr-text-faint: #6e7781;
  --gr-accent: #818cf8;
  --gr-accent-subtle: #1e1b4b;
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
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  font-size: 14px;
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

.gr-pr-description {
  margin-top: 4px;
  border: 1px solid var(--gr-border);
  border-radius: 8px;
  background: var(--gr-bg-subtle);
}

.gr-pr-description summary {
  cursor: pointer;
  padding: 8px 12px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--gr-text-muted);
  list-style: none;
}

.gr-pr-description summary::-webkit-details-marker {
  display: none;
}

.gr-pr-description summary::before {
  content: "▸ ";
}

.gr-pr-description[open] summary::before {
  content: "▾ ";
}

.gr-pr-description-body {
  padding: 0 12px 12px;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
  color: var(--gr-text);
}

.gr-pr-description-body:not(.markdown-body) {
  white-space: pre-wrap;
}

.gr-pr-description-body.markdown-body img {
  max-width: 100%;
  border-radius: 6px;
}

.gr-pr-description-body.markdown-body p {
  margin: 0 0 8px;
}

.gr-pr-description-body.markdown-body p:last-child {
  margin-bottom: 0;
}

.gr-pr-description-body.markdown-body a {
  color: var(--gr-accent, #4493f8);
}

.gr-pr-description-body.markdown-body ul,
.gr-pr-description-body.markdown-body ol {
  padding-left: 1.5em;
  margin: 0 0 8px;
}

.gr-pr-description-body.markdown-body code {
  background: var(--gr-bg);
  border-radius: 4px;
  padding: 0.1em 0.35em;
  font-size: 0.9em;
}

.gr-pr-description-body.markdown-body pre {
  background: var(--gr-bg);
  border-radius: 6px;
  padding: 8px;
  overflow-x: auto;
}

.gr-pr-description-body.markdown-body pre code {
  background: none;
  padding: 0;
}

.gr-pr-description-body.markdown-body blockquote {
  margin: 0 0 8px;
  padding-left: 10px;
  border-left: 3px solid var(--gr-border);
  color: var(--gr-text-muted);
}

.gr-context-panel {
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 2px 0 4px;
}

.gr-context-panel-body {
  font-size: 15px;
  line-height: 1.7;
  color: var(--gr-text);
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
  border: 1px solid var(--gr-border);
  background: var(--gr-accent);
  color: white;
  border-radius: 6px;
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.gr-nav-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.gr-nav-btn.gr-secondary {
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

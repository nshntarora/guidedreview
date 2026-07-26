/**
 * Syntax highlighting for diff code lines.
 *
 * Uses highlight.js's core (no built-in language bundle) with a curated set
 * of languages registered explicitly, to keep the content-script bundle
 * small rather than pulling in every grammar highlight.js ships.
 *
 * We deliberately highlight a whole reconstructed file/hunk body in one call
 * and then split the resulting HTML back into per-line fragments (re-opening
 * any tags that straddle a newline) rather than highlighting each diff line
 * in isolation — highlighting single lines independently loses context for
 * multi-line constructs like block comments and template strings.
 */
import hljs from "highlight.js/lib/core";

import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import go from "highlight.js/lib/languages/go";
import graphql from "highlight.js/lib/languages/graphql";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import kotlin from "highlight.js/lib/languages/kotlin";
import less from "highlight.js/lib/languages/less";
import lua from "highlight.js/lib/languages/lua";
import markdown from "highlight.js/lib/languages/markdown";
import objectivec from "highlight.js/lib/languages/objectivec";
import php from "highlight.js/lib/languages/php";
import python from "highlight.js/lib/languages/python";
import ruby from "highlight.js/lib/languages/ruby";
import rust from "highlight.js/lib/languages/rust";
import scss from "highlight.js/lib/languages/scss";
import shell from "highlight.js/lib/languages/shell";
import sql from "highlight.js/lib/languages/sql";
import swift from "highlight.js/lib/languages/swift";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import zig from "highlightjs-zig";

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("c", c);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("csharp", csharp);
hljs.registerLanguage("css", css);
hljs.registerLanguage("go", go);
hljs.registerLanguage("graphql", graphql);
hljs.registerLanguage("java", java);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("kotlin", kotlin);
hljs.registerLanguage("less", less);
hljs.registerLanguage("lua", lua);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("objectivec", objectivec);
hljs.registerLanguage("php", php);
hljs.registerLanguage("python", python);
hljs.registerLanguage("ruby", ruby);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("scss", scss);
hljs.registerLanguage("shell", shell);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("swift", swift);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("zig", zig);

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  py: "python",
  pyw: "python",
  go: "go",
  rb: "ruby",
  rake: "ruby",
  java: "java",
  c: "c",
  h: "c",
  cc: "cpp",
  cpp: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  cs: "csharp",
  rs: "rust",
  php: "php",
  json: "json",
  yml: "yaml",
  yaml: "yaml",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  css: "css",
  scss: "scss",
  less: "less",
  html: "xml",
  htm: "xml",
  xml: "xml",
  svg: "xml",
  md: "markdown",
  markdown: "markdown",
  sql: "sql",
  kt: "kotlin",
  kts: "kotlin",
  swift: "swift",
  m: "objectivec",
  mm: "objectivec",
  graphql: "graphql",
  gql: "graphql",
  lua: "lua",
  zig: "zig",
};

/** Map a file path to a registered highlight.js language id, or undefined if unknown. */
export function languageForPath(path: string): string | undefined {
  const base = path.split("/").pop() ?? path;
  const dotIndex = base.lastIndexOf(".");
  if (dotIndex <= 0) return undefined;
  const ext = base.slice(dotIndex + 1).toLowerCase();
  const lang = EXTENSION_TO_LANGUAGE[ext];
  if (!lang || !hljs.getLanguage(lang)) return undefined;
  return lang;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Highlight `code` as `language` and split the result into one HTML string
 * per source line, re-opening any `<span>` tags that were left open across a
 * newline so each returned fragment is independently valid, self-contained
 * HTML.
 */
export function highlightToLines(code: string, language: string): string[] {
  let highlighted: string;
  try {
    highlighted = hljs.highlight(code, { language, ignoreIllegals: true }).value;
  } catch {
    // Diff content is attacker-controlled (any PR author writes it), and the
    // caller renders every returned line via dangerouslySetInnerHTML — escape
    // this fallback so a highlight failure can't become an HTML injection.
    return code.split("\n").map(escapeHtml);
  }

  const rawLines = highlighted.split("\n");
  // Sticky so it matches at `idx` without slicing the line on every character —
  // this runs over every rendered diff line, and slicing made it quadratic.
  const openTagRe = /<span class="([^"]*)">/y;
  const lines: string[] = [];
  let openStack: string[] = [];

  for (const rawLine of rawLines) {
    const prefix = openStack.map((cls) => `<span class="${cls}">`).join("");

    // Walk this line's tags to track which spans are still open at its end.
    const stack = [...openStack];
    let idx = 0;
    while (idx < rawLine.length) {
      openTagRe.lastIndex = idx;
      const openMatch = openTagRe.exec(rawLine);
      if (openMatch) {
        stack.push(openMatch[1]);
        idx = openTagRe.lastIndex;
        continue;
      }
      if (rawLine.startsWith("</span>", idx)) {
        stack.pop();
        idx += "</span>".length;
        continue;
      }
      idx++;
    }

    const suffix = "</span>".repeat(stack.length);
    lines.push(prefix + rawLine + suffix);
    openStack = stack;
  }

  return lines;
}

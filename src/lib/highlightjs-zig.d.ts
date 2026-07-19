/**
 * `highlightjs-zig` ships no type declarations — it's a plain highlight.js
 * `LanguageFn` module (same shape as the built-in `highlight.js/lib/languages/*`
 * grammars we import elsewhere in highlight.ts).
 */
declare module "highlightjs-zig" {
  import type { LanguageFn } from "highlight.js";
  const zig: LanguageFn;
  export default zig;
}

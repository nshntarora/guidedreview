import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/.next/**",
      "**/out/**",
      "**/test-results/**",
      "**/playwright-report/**",
      "**/blob-report/**",
      "**/*.tsbuildinfo",
      "package-lock.json",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      // Core React hooks rules only — newer React Compiler rules (set-state-in-effect,
      // refs, immutability) flag established patterns; enable incrementally later.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  // Playwright fixtures expose a `use` helper that is not a React hook.
  {
    files: ["**/e2e/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
  // Node scripts (CommonJS/ESM tooling)
  {
    files: ["**/*.{mjs,cjs,js}"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "writable",
      },
    },
  },
  // Next.js generates this file with triple-slash refs
  {
    files: ["**/next-env.d.ts"],
    rules: {
      "@typescript-eslint/triple-slash-reference": "off",
    },
  },
  {
    files: ["**/*.{test,spec}.{ts,tsx}", "**/test/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  // The extension reaches chrome.storage and chrome.runtime.sendMessage through
  // exactly one module each, so a future non-Chrome target is a change in two
  // files rather than thirty. Tests mock the raw APIs and are exempt.
  {
    files: ["apps/extension/src/**/*.{ts,tsx}"],
    ignores: [
      "apps/extension/src/lib/storage.ts",
      "apps/extension/src/lib/messaging.ts",
      "apps/extension/src/**/*.{test,spec}.{ts,tsx}",
      "apps/extension/src/test/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[object.object.name='chrome'][object.property.name='storage']",
          message: "Use the helpers in lib/storage.ts instead of chrome.storage directly.",
        },
        {
          selector:
            "CallExpression[callee.object.object.name='chrome'][callee.object.property.name='runtime'][callee.property.name='sendMessage']",
          message: "Use the helpers in lib/messaging.ts instead of chrome.runtime.sendMessage.",
        },
      ],
    },
  },
  // packages/ui must stay chrome-free and extension-free
  {
    files: ["packages/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "chrome",
              message: "Shared UI must not use Chrome APIs.",
            },
          ],
          patterns: [
            {
              group: ["**/apps/extension/**", "@guided-review/extension"],
              message: "Shared UI must not import the extension app.",
            },
          ],
        },
      ],
    },
  },
  // apps/web must not import the extension
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/apps/extension/**", "@guided-review/extension", "@/../extension/**"],
              message: "Web app must not import the Chrome extension package.",
            },
          ],
        },
      ],
    },
  },
  prettier,
);

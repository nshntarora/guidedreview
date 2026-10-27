# Guide refresh verification

All eight registered guides now exceed 1,000 reader-visible words and contain a cover image plus one supporting illustration in the approved design language. The copy adds practical examples, review decisions, failure cases, and concrete workflows. Existing FAQ structured data remains intact.

Counts come from the exported article HTML. They include headings and each visible FAQ once, excluding structured-data scripts, image alt text, page navigation, and related reading.

| Guide                                             | Rendered words | Images |
| ------------------------------------------------- | -------------: | -----: |
| Bring your own key to code review                 |          1,284 |      2 |
| AI code review that does not auto-approve         |          1,273 |      2 |
| A Chrome extension to review GitHub pull requests |          1,276 |      2 |
| Using Guided Review in a team review workflow     |          1,183 |      2 |
| A keyboard-first code review workflow             |          1,259 |      2 |
| How to review an AI-generated pull request        |          1,351 |      2 |
| How to review a large AI-generated PR             |          1,229 |      2 |
| Review local git changes before opening a PR      |          1,311 |      2 |

## Assets

Production assets live in `apps/web/public/assets/guides/<guide-slug>/`. Each directory contains `cover.webp` and one descriptively named supporting image. The exact paths and sizes appear in [verification.json](verification.json). All 16 files total 560,864 bytes; individual files range from 21,118 to 70,194 bytes.

Images were generated with the built-in image generation tool, then encoded as WebP without changing their 1536 × 1024 dimensions. Each image has descriptive alt text and explicit width and height. Covers load eagerly; supporting images load lazily. The source PNGs remain in the original image-generator directory, with task-local copies archived under `/private/tmp/guidedreview-guide-image-sources`.

The complete final prompt set is in [prompts.md](prompts.md). The pilot and approved visual direction are recorded in [design-preview.md](design-preview.md).

## Checks

- `pnpm build:web` passed, including MDX compilation and all static routes.
- `pnpm --filter @guided-review/web typecheck` passed.
- `pnpm run lint` passed.
- Prettier checks and `git diff --check` passed.
- Exported-page audit confirmed every guide has at least 1,000 words, one H1, exactly two images, nonempty alt text, correct dimensions and loading behavior, existing image files, and valid internal page destinations.
- Desktop (1440 px) and mobile (390 px) browser previews of the pilot guide were visually inspected. Article content widths matched scroll widths, with the cover scaling correctly at both sizes.

No new test suites were added for these static content changes.

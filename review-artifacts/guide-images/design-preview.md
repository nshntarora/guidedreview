# Guide illustration design preview

Status: design language approved by the user. The full set has been generated with the built-in image generation tool and integrated into the eight existing guides. Production assets are WebP; full generation prompts are in `prompts.md`, and exported-page checks are recorded in `verification.json`.

Pilot guide: How to review a large AI-generated PR.

## Assets

- Cover: apps/web/public/assets/guides/review-large-ai-generated-prs/cover.webp
- Supporting illustration: apps/web/public/assets/guides/review-large-ai-generated-prs/trace-one-value.webp

## Design direction

Use the existing warm-black surfaces, restrained lime accent, monospace labels, thin borders and subtle grain. Show concrete review concepts: file cards, review units, contracts, callers and test questions. Reserve red and green for removed and added diff lines. These are conceptual editorial illustrations, not product screenshots. Avoid automated verdicts or approval imagery. When adding these images to the guide, explain the timeout defaults and old/new clients as a hypothetical migration example in the prose, and provide descriptive alt text.

## Initial guide inventory

All eight guide MDX files fall below 1,000 words even before excluding MDX code. Raw whitespace counts are an upper-bound inventory, not final reader-visible word counts.

| Guide slug                       | Raw MDX words |
| -------------------------------- | ------------: |
| byo-key-code-review              |           667 |
| code-review-without-auto-approve |           674 |
| github-pr-review-extension       |           680 |
| guided-review-for-teams          |           487 |
| keyboard-first-code-review       |           522 |
| review-ai-generated-pull-request |           722 |
| review-large-ai-generated-prs    |           488 |
| review-local-changes-before-pr   |           700 |

Implementation: each existing guide has been expanded through practical examples, decisions, failure cases and useful steps, with a cover and one supporting illustration. The copy follows the project's peer-engineer voice; product claims were checked against the local CLI scope logic, shared keyboard handlers, core chunking implementation, and existing provider and data documentation. Final counts measure rendered article text with FAQs counted once, excluding scripts, image metadata, navigation, and related reading.

## Cover prompt

Use case: illustration-story
Asset type: editorial cover image for Guided Review guide "How to review a large AI-generated PR", wide landscape 1536x1024.
Primary request: Create a precise, restrained technical editorial illustration showing a large pull request becoming a readable sequence of review units. A flat cluster of numerous small file/diff cards on the left connects by a few carefully routed thin lines into three well spaced numbered review-unit panels on the right. The transformation is about ordering a human's reading, never an automated verdict.
Style/medium: beautifully composed flat technical print illustration, crisp vector-like edges rendered as a bitmap, subtle fine paper grain, mostly frontal orthographic view, quiet and practical software-engineer aesthetic. Align with a dark code-review tool's visual language; mature, spare, no playful mascots.
Scene/backdrop: uniform warm near-black #0d0806 with very faint grain; raised panels #16120f, fine borders #4a433c. Off-white #fefefe and subdued warm-gray linework. Brand lime #caff57 used sparingly for the reading route, numbered markers and one active panel. Desaturated green #56d364 and coral #ff7b72 permitted ONLY as tiny added/deleted diff rows on the source cards. No other accent colors.
Composition/framing: generous margins and breathing room, central coherent scene, balanced strong silhouette readable at thumbnail size; no large page title embedded. Cards contain abstract short code strokes rather than fabricated readable code. Source cards are organized, not flying or exploding. The three ordered review panels should each show a clear short monospace label and smaller abstract line details. Exact labels: "01 Contract", "02 Callers", "03 Tests". Small source label: "changed files". Small destination label: "review units".
Constraints: text limited to the five specified labels; all text should be clean readable monospace. Human review is implicit in a selected reading path. No checkmarks, approval badges, robots, brains, magic wands, shields, corporate stock imagery, neon glow, gradients, 3D glass, photorealism, browser logos, invented brand logo, watermark or signature. Do not imply the model supplies code or approves changes. This is a conceptual article illustration, not a screenshot.

## Supporting illustration prompt

Use case: infographic-diagram
Asset type: supporting editorial illustration within Guided Review guide "How to review a large AI-generated PR". Wide landscape, 1536x1024.
Primary request: A practical technical illustration that teaches the reader to trace one timeout value through contract, callers and tests, then distinguish a field rename from a unit conversion. Match the previous cover image's warm-black, restrained lime, fine-grain, crisp flat technical diagram design language.
Composition: generous negative space with three equal upright panels in a single horizontal row across the middle. A thin lime reading-route line connects them left to right with small arrowheads, clearly outside the text. The first panel is labeled "01 Contract", the second "02 Callers", the third "03 Tests". Each panel contains just two very short large readable monospace lines, arranged like code snippets or technical notes. No dense prose or decorative fake interface. Below the three panels, one elegant outlined question strip spans the width.
Text verbatim:
Top small label: "trace one value"
Panel one title: "01 Contract"
Panel one lines: "timeout → timeoutMs" and "default: 5000"
Panel two title: "02 Callers"
Panel two lines: "old client: 5 seconds" and "new client: 5000 ms"
Panel three title: "03 Tests"
Panel three lines: "old field? missing field?" and "5 seconds ≠ 5 ms"
Bottom strip text: "Rename, conversion, or compatibility change?"
Style/medium: flat editorial technical illustration, bitmap with vector-like crisp linework and subtle paper grain; frontal orthographic view, fine rounded rectangular frames and small minimal document symbols. Muted neutral abstract code strokes may sit beneath panel text, but prioritize readability. Same warm dark palette and monospace text as a code-review product, deliberate print-like composition.
Color palette: background #0d0806; panel fill #16120f; neutral borders #4a433c; main text warm off-white #fefefe; secondary text subdued gray, still readable; lime #caff57 only for route and numeric markers and the final question outline. No red or green since this diagram does not show actual diff rows.
Constraints: conceptual article illustration, not a product screenshot. Only the text specified above. No claims of automatic test execution or approval, no checkmarks or green passed-test indicators, no automated verdict, no robotic/brain mascots, magic, neon glow, extra accent colors, 3D glass, gradients, logos, watermark or signature. Tests panel represents questions for a human to investigate.

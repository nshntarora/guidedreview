# Search and AI visibility audit

Audited 2026-10-21 against the live site, this repository, `llms.txt`, and the vendor sources named below. Live word counts include shared navigation and footer copy, so they are useful for inventorying pages but not for enforcing the 800–1,400-word article requirement; source MDX counts are used for that check.

## Gaps

- [D3] exists-but-misaligned: `/docs/privacy-and-data` targets “where your code goes” rather than the mapped query “code review tool that does not upload your diff”; its title and meta description do not match the approved pair.
- [D4] exists-but-misaligned: `/docs/why` has the approved title and intro answer, but its meta description does not match the approved query-focused description.
- [G1] exists-but-misaligned: `/guides/review-ai-generated-pull-request` is about 435 source words, below the required 800–1,400 words, and lacks the required audience, when-not-to-use, and visible FAQ sections.
- [G2] exists-but-misaligned: `/guides/review-local-changes-before-pr` is about 456 source words, below the required range, and lacks the required audience, when-not-to-use, and visible FAQ sections.
- [G3] exists-but-misaligned: `/guides/github-pr-review-extension` is about 442 source words, below the required range, and lacks the required audience, when-not-to-use, and visible FAQ sections.
- [G4] exists-but-misaligned: `/compare/coderabbit-alternative` exceeds the 1,400-word page limit and does not use the mapped query in its H1/title. It needs an explicit “when Guided Review is the worse choice” section.
- [G5] exists-but-misaligned: `/compare/graphite-diamond-alternative` exceeds the 1,400-word page limit and does not use the mapped query in its H1/title. The old Diamond URL redirects to Graphite's current AI Reviews page, which also uses the Graphite Chat name; the page should say so and compare the current product.
- [G6] exists-but-misaligned: `/compare/copilot-code-review-alternative` exceeds the 1,400-word page limit and does not use the mapped query in its H1/title. It needs an explicit “when Guided Review is the worse choice” section.
- [G7] exists-but-misaligned: `/guides/byo-key-code-review` is about 430 source words, below the required range, and lacks the required audience, worked-example, when-not-to-use, and visible FAQ sections.
- [G8] exists-but-misaligned: `/guides/code-review-without-auto-approve` is about 419 source words, below the required range, and lacks the required audience, when-not-to-use, and visible FAQ sections.
- [L1] inbound-link gap: the new answer URLs are listed by the new collection pages and `llms.txt`, but the older `/docs/why` page does not contextually link to each new guide and comparison.
- [T1] duplicate host: `https://www.guidedreview.dev/` returns 200 instead of redirecting to `https://guidedreview.dev/`. This requires a Cloudflare custom-domain or redirect rule rather than a static-export source change.

## Page-map status

| ID  | URL                                        | Audit status                                   |
| --- | ------------------------------------------ | ---------------------------------------------- |
| D0  | `/`                                        | exists; aligned                                |
| D1  | `/docs/cli`                                | exists; aligned                                |
| D2  | `/docs/chrome-extension`                   | exists; aligned                                |
| D3  | `/docs/privacy-and-data`                   | exists-but-misaligned                          |
| D4  | `/docs/why`                                | exists-but-misaligned                          |
| G1  | `/guides/review-ai-generated-pull-request` | exists-but-misaligned                          |
| G2  | `/guides/review-local-changes-before-pr`   | exists-but-misaligned                          |
| G3  | `/guides/github-pr-review-extension`       | exists-but-misaligned                          |
| G4  | `/compare/coderabbit-alternative`          | exists-but-misaligned                          |
| G5  | `/compare/graphite-diamond-alternative`    | exists-but-misaligned; current product fetched |
| G6  | `/compare/copilot-code-review-alternative` | exists-but-misaligned                          |
| G7  | `/guides/byo-key-code-review`              | exists-but-misaligned                          |
| G8  | `/guides/code-review-without-auto-approve` | exists-but-misaligned                          |
| G9  | `/compare/greptile-alternative`            | later; intentionally absent                    |
| G10 | `/compare/qodo-alternative`                | later; intentionally absent                    |

## Live sitemap inventory

Every row returned HTTP 200 on 2026-10-21, had `index, follow`, and had the self-referencing canonical shown by its URL. Titles, descriptions, H1s, and approximate rendered-body word counts follow.

| URL                                        | Title                                                             | Meta description                                                                                                                                                 | H1                                                                   | Words |
| ------------------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----: |
| `/`                                        | Review AI-generated code before you approve it \| Guided Review   | A Chrome extension for GitHub PRs and a CLI for local diffs. AI clusters the change into review units. You still read the code. Free, open source, your API key. | Review AI-generated code before you sign your name to it             |   658 |
| `/docs`                                    | Documentation · Guided Review                                     | Learn what Guided Review does across GitHub pull requests and local git diffs, how it creates an ordered walkthrough, and where to start.                        | Introduction                                                         |   740 |
| `/privacy`                                 | Privacy Policy · Guided Review                                    | Read how Guided Review collects, uses, stores, and protects personal data across its website, Chrome extension, local CLI, and connected providers.              | Privacy Policy                                                       | 2,779 |
| `/terms`                                   | Terms of Service · Guided Review                                  | Read the terms governing Guided Review's website, Chrome extension, local CLI, provider connections, acceptable use, and legal responsibilities.                 | Terms of Service                                                     | 3,470 |
| `/cookies`                                 | Cookies Policy · Guided Review                                    | Learn how the Guided Review website uses essential storage and optional analytics technologies, how to disable them, and what the apps do not track.             | Cookies Policy                                                       |   875 |
| `/docs/why`                                | Why AI-generated code still needs a human review \| Guided Review | Tests can show that an abstraction works. They cannot tell you whether it belongs in the product. That decision still needs someone to read the code.            | Why AI-generated code still needs a human review                     |   424 |
| `/docs/install`                            | Install · Guided Review                                           | Install Guided Review for GitHub pull requests or local git diffs, then choose the Chrome extension or CLI workflow that fits your review.                       | Install                                                              |   506 |
| `/docs/chrome-extension`                   | GitHub pull request review extension \| Guided Review             | Start Guided Review on a github.com PR. Your key, your provider. Draft comments and submit from the overlay.                                                     | Chrome Extension                                                     |   715 |
| `/docs/cli`                                | Review a local branch before you open the PR \| Guided Review CLI | npx @guided-review/cli walks a branch, commit, or working tree as review units. Node 22+. No Guided Review backend.                                              | CLI                                                                  | 1,087 |
| `/docs/configure-provider`                 | Configure AI provider · Guided Review                             | Configure Anthropic, OpenAI, or Grok for Guided Review, add your API key in the extension or CLI, choose a model, and understand usage costs.                    | Configure AI provider                                                | 1,045 |
| `/docs/connect-github`                     | Connect GitHub · Guided Review                                    | Connect Guided Review to GitHub with device flow so you can submit reviews and line comments from the Chrome extension when you choose.                          | Connect GitHub                                                       |   680 |
| `/docs/first-review`                       | Your first review · Guided Review                                 | Start your first Guided Review on a GitHub pull request, walk ordered review units, search the diff, leave comments, and resume later.                           | Your first review                                                    |   837 |
| `/docs/reading-the-overlay`                | Reading the overlay · Guided Review                               | Learn the Guided Review overlay: review units sidebar, context panel, real diff pane, change summary, PR description, and header actions.                        | Reading the overlay                                                  |   748 |
| `/docs/how-it-works`                       | How a review plan works · Guided Review                           | See how Guided Review parses diffs, chunks large changes, validates review units, and falls back file by file when no AI provider is configured.                 | How a review plan works                                              |   934 |
| `/docs/images-and-binaries`                | Images binary files · Guided Review                               | See how Guided Review handles image previews, binary files, and elided diffs across the Chrome extension and local review CLI.                                   | Images binary files                                                  |   614 |
| `/docs/leave-comments`                     | Leave line comments · Guided Review                               | Draft GitHub-style line comments while walking Guided Review units, edit or remove them locally, then submit through the extension.                              | Leave line comments                                                  |   716 |
| `/docs/generate-prompt`                    | Generate Prompt · Guided Review                                   | Turn local Guided Review notes into a focused coding-agent prompt, copy it from the CLI, and keep review decisions in human hands.                               | Generate Prompt                                                      |   681 |
| `/docs/submit-review`                      | Submit a review · Guided Review                                   | Submit drafted line comments and a Comment, Approve, or Request Changes decision from Guided Review through the GitHub API.                                      | Submit a review                                                      |   608 |
| `/docs/keyboard-shortcuts`                 | Keyboard shortcuts · Guided Review                                | Keyboard-first shortcuts for review navigation, diff search, unified/split view, comments, submit, and the local CLI UI.                                         | Keyboard shortcuts                                                   |   843 |
| `/docs/troubleshooting`                    | Troubleshooting · Guided Review                                   | Fix missing Guided Review buttons, provider and API-key errors, failed plans, GitHub connection problems, and local CLI issues.                                  | Troubleshooting                                                      | 1,211 |
| `/docs/faq`                                | FAQ · Guided Review                                               | Answers about Guided Review setup, privacy, provider costs, GitHub access, the Chrome extension, local CLI, and what the AI does.                                | FAQ                                                                  | 1,003 |
| `/docs/privacy-and-data`                   | Where your code goes during review \| Guided Review               | AI structuring sends the diff to your provider. The extension also talks to GitHub. Keys are stored locally. There is no Guided Review product backend.          | Privacy data                                                         |   811 |
| `/guides`                                  | Guides · Guided Review                                            | An agent wrote the change. You still have to read it. Guides to following the diff, checking tests, and reviewing local work before opening a PR.                | Guides                                                               |   325 |
| `/compare`                                 | Compare code review tools · Guided Review                         | Guided Review, CodeRabbit, Graphite, and GitHub Copilot. Compare the work each tool does, the costs, and the reasons to keep what you already use.               | Compare code review tools                                            |   236 |
| `/guides/review-ai-generated-pull-request` | How to review an AI-generated pull request · Guided Review        | An agent renames timeout to timeoutMs. Is it a rename, a conversion, or a compatibility change? Follow the value before approving the PR.                        | How to review an AI-generated pull request                           |   581 |
| `/guides/review-local-changes-before-pr`   | Review local git changes before opening a PR · Guided Review      | A branch diff can miss the test still in your working tree. Pick the right local scope, read the change, and check what you are about to publish.                | Review local git changes before opening a PR                         |   601 |
| `/guides/github-pr-review-extension`       | A Chrome extension to review GitHub pull requests · Guided Review | Follow a GitHub PR across types, callers, and tests in a Chrome overlay. Your provider key, the real diff, and comments you choose to submit.                    | A Chrome extension to review GitHub pull requests                    |   592 |
| `/guides/byo-key-code-review`              | Bring your own key to code review · Guided Review                 | Your key tells you who pays for inference. Follow where Guided Review sends the diff, what stays local, and which actions make a model call.                     | Bring your own key to code review                                    |   586 |
| `/guides/code-review-without-auto-approve` | AI code review that does not auto-approve · Guided Review         | A summary says invalid input is rejected. Which input? Read the condition and its test before choosing whether to approve.                                       | AI code review that does not auto-approve                            |   561 |
| `/compare/coderabbit-alternative`          | Guided Review vs CodeRabbit for engineers (2026)                  | Guided Review vs CodeRabbit in 2026 for engineers: compare diff reading, automated feedback, costs, setup, and when to keep CodeRabbit.                          | Guided Review vs CodeRabbit: reading or automated feedback (2026)    | 1,799 |
| `/compare/graphite-diamond-alternative`    | Guided Review vs Graphite for engineers (2026)                    | Guided Review vs Graphite in 2026 for engineers: compare diff reading, AI feedback, pricing, setup, and when Graphite is the better fit.                         | Guided Review vs Graphite: a walkthrough or team review tools (2026) | 1,817 |
| `/compare/copilot-code-review-alternative` | Guided Review vs GitHub Copilot for engineers (2026)              | Guided Review vs GitHub Copilot in 2026 for engineers: compare diff reading, review comments, pricing, setup, and who should keep Copilot.                       | Guided Review vs GitHub Copilot: reading or review comments (2026)   | 1,822 |

## Technical

- canonical host: `https://guidedreview.dev`; HTTP redirects to HTTPS. `www` is an unresolved duplicate because it serves 200.
- trailing slashes: nested trailing-slash variants return 308 to the slashless canonical path.
- sitemap: present, valid, generated from the docs, guides, and comparison registries; all 31 listed URLs returned 200.
- robots: present, allows `/`, and points to `https://guidedreview.dev/sitemap.xml`.
- llms.txt: present and consistent with the product and live routes; all G1–G8 URLs are already listed.
- indexability issues: no page-level `noindex` or HTTP failure found. The `www` duplicate should redirect at the host layer.
- Search Console: `SEARCH_CONSOLE_ABSENT`. No credential-like environment variable or repository integration was present, so indexed/crawled/discovered status and impression queries could not be fetched.
- schema: article and breadcrumb schema exist on guides and comparisons. Visible FAQ schema exists on comparison pages; the five guides need visible FAQs before FAQ schema is added.

## Fetched comparison facts

- CodeRabbit's current product page says it reviews every PR automatically and shows bot comments with committable suggestions. No current price is needed for the rewritten page.
- `https://graphite.com/diamond` redirects to `/features/ai-reviews`. The live page is titled “AI Reviews,” calls the experience Graphite Chat, and describes instant reviews, PR comments, and one-click fixes. The old Diamond route still exists only as a redirect.
- GitHub's current Copilot code-review documentation says Copilot can be requested as a reviewer, leaves review comments with severity labels and suggested changes, and can optionally be configured to approve. Guided Review does not select the review outcome.

## NEEDS_HUMAN

- Configure the `www.guidedreview.dev` custom domain to redirect to `https://guidedreview.dev` in Cloudflare. The static-export repository cannot enforce a host-level redirect.
- Search Console indexing and query data could not be audited because credentials were absent (`SEARCH_CONSOLE_ABSENT`).
- No unconfirmed product sentence was added. Claims about bug-finding rates, time saved, Enterprise support, other forges, hosted models, or customer evidence remain omitted.

## Will not do

- No pages for the unqualified terms “code review,” “AI code review,” or “pull request.”
- No G9 Greptile or G10 Qodo/PR-Agent comparison in this run.
- No GitHub Enterprise, GitLab, Bitbucket, Firefox, Safari, IDE, hosted inference, SSO, audit-log, admin-control, or SOC2 claims.
- No review schema, fake testimonials, rankings, benchmark claims, directory submissions, outreach sending, or indexing requests.

## Outreach sources checked

- AlternativeTo's “CodeRabbit Alternatives” page, updated 2026-08-27, currently frames the category around AI-powered PR review products.
- “Best AI Code Review Tools (2026): 12 Tools Compared” on aicodereview.io lists automated reviewers and bug-finders; it does not present a human-driven diff walkthrough category.
- PrivacyTools.io's 2026 privacy-tools directory is a suitable human outreach target for the no-product-backend angle, without implying an endorsement.
- The live Chrome Web Store description says “clustered changes, summaries, keyboard-first” but omits the two-host/BYO-key boundary and that the reviewer decides. The live GitHub About line names a CLI and Chrome extension but omits `@guided-review/cli` and the fact that Guided Review does not auto-approve. The npm description explains the local workflow but omits those two details and points its homepage at the old redirected `/docs/local-review` URL.

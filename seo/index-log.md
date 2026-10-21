# Indexing handoff

Prepared 2026-10-21. These URLs were changed in this run. No indexing request was submitted; after merge and deployment, a human should inspect the canonical and request indexing in Search Console.

| URL                                                                | Change                                                            | Request after merge |
| ------------------------------------------------------------------ | ----------------------------------------------------------------- | ------------------- |
| `https://guidedreview.dev/docs/privacy-and-data`                   | title and meta aligned                                            | yes                 |
| `https://guidedreview.dev/docs/why`                                | meta aligned; contextual inbound links added                      | yes                 |
| `https://guidedreview.dev/guides/review-ai-generated-pull-request` | answer page expanded; visible FAQ schema                          | yes                 |
| `https://guidedreview.dev/guides/review-local-changes-before-pr`   | answer page expanded; visible FAQ schema                          | yes                 |
| `https://guidedreview.dev/guides/github-pr-review-extension`       | answer page expanded; visible FAQ schema                          | yes                 |
| `https://guidedreview.dev/compare/coderabbit-alternative`          | query alignment; current facts; honest worse-fit section          | yes                 |
| `https://guidedreview.dev/compare/graphite-diamond-alternative`    | current product naming; query alignment; honest worse-fit section | yes                 |
| `https://guidedreview.dev/compare/copilot-code-review-alternative` | query alignment; current facts; honest worse-fit section          | yes                 |
| `https://guidedreview.dev/guides/byo-key-code-review`              | answer page expanded; visible FAQ schema                          | yes                 |
| `https://guidedreview.dev/guides/code-review-without-auto-approve` | answer page expanded; visible FAQ schema                          | yes                 |
| `https://guidedreview.dev/guides`                                  | sitemap modification date refreshed                               | inspect only        |
| `https://guidedreview.dev/compare`                                 | sitemap modification date refreshed                               | inspect only        |
| `https://guidedreview.dev/llms.txt`                                | answer-page descriptions refreshed                                | not applicable      |

## Before requesting indexing

- Deploy the merged static export.
- Confirm each URL returns 200, has its self-canonical, and remains `index, follow`.
- Configure `www.guidedreview.dev` to redirect to `https://guidedreview.dev` in Cloudflare, then verify the redirect separately.
- Request indexing for the ten page URLs marked “yes.” Do not record success here until Search Console confirms the submission.

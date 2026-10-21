# Search and AI visibility implementation plan

This table is limited to section 7 URLs and changes directly required by the audit. Rows are ordered so page alignment precedes new inbound links and registry/AI-crawler updates.

| ID   | Action        | URL                                        | Query                                                | Depends on                                            |
| ---- | ------------- | ------------------------------------------ | ---------------------------------------------------- | ----------------------------------------------------- |
| D3   | retitle       | `/docs/privacy-and-data`                   | code review tool that does not upload your diff      | none                                                  |
| D4   | retitle       | `/docs/why`                                | why AI-generated code still needs a human review     | none                                                  |
| G1   | intro         | `/guides/review-ai-generated-pull-request` | how to review an AI-generated pull request           | none                                                  |
| G1-S | schema        | `/guides/review-ai-generated-pull-request` | how to review an AI-generated pull request           | G1 visible FAQ                                        |
| G2   | intro         | `/guides/review-local-changes-before-pr`   | review local git changes before opening a PR         | none                                                  |
| G2-S | schema        | `/guides/review-local-changes-before-pr`   | review local git changes before opening a PR         | G2 visible FAQ                                        |
| G3   | intro         | `/guides/github-pr-review-extension`       | Chrome extension to review GitHub pull requests      | none                                                  |
| G3-S | schema        | `/guides/github-pr-review-extension`       | Chrome extension to review GitHub pull requests      | G3 visible FAQ                                        |
| G4   | intro         | `/compare/coderabbit-alternative`          | CodeRabbit alternative for reading the diff yourself | fetched CodeRabbit product page                       |
| G5   | intro         | `/compare/graphite-diamond-alternative`    | Graphite Diamond alternative                         | fetched Graphite redirect and current AI Reviews page |
| G6   | intro         | `/compare/copilot-code-review-alternative` | Copilot code review alternative                      | fetched GitHub documentation                          |
| G7   | intro         | `/guides/byo-key-code-review`              | bring your own key code review                       | none                                                  |
| G7-S | schema        | `/guides/byo-key-code-review`              | bring your own key code review                       | G7 visible FAQ                                        |
| G8   | intro         | `/guides/code-review-without-auto-approve` | AI code review that does not auto-approve            | none                                                  |
| G8-S | schema        | `/guides/code-review-without-auto-approve` | AI code review that does not auto-approve            | G8 visible FAQ                                        |
| L1   | internal-link | `/docs/why`                                | the eight mapped answer queries                      | G1–G8 aligned                                         |
| T2   | technical     | G1–G8 registry entries and sitemap         | current modification dates                           | G1–G8 aligned                                         |
| T3   | technical     | `/llms.txt`                                | answer-page discovery                                | G1–G8 aligned                                         |

`T1` from the audit is not in the implementation table because it requires a Cloudflare host-level redirect and cannot be truthfully completed in this repository-only PR. The human action remains in `seo/audit.md` and `seo/index-log.md`.

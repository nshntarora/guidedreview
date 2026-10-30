# Release notes

GitHub releases are the source for the website changelog. Publishing, editing,
unpublishing, or deleting a release rebuilds the static site from `main`. Drafts
and prereleases are excluded. Promoting a prerelease to a stable release also
rebuilds the site.

Use a version tag such as `v0.4.0`. Begin the release title with that version,
followed by a short description of the main change, for example
**v0.4.0 — Review local changes with the CLI**. The website displays this title
and derives `/changelog/0.4.0` from the tag.

Begin the body with a plain-text paragraph explaining what changed and what it
lets the user do. This becomes the description on the changelog index and the
page's search metadata. Follow it with Markdown sections explaining features,
improvements, and fixes. Describe observable behavior and any action the user
needs to take. Keep generated commit lists, comparison links, and contributor
credits below the explanation.

```markdown
Review local git changes in your browser before opening a pull request.
Choose a review scope and walk through ordered review units with your own LLM key.

## New

- Start a local review with `npx @guided-review/cli`.
- Switch between staged and working tree changes in the scope picker.

## Fixes

- Diff file headers stay visible while scrolling.

## Contributors and full diff

Keep GitHub's generated change list and contributor credits here.
```

Run `pnpm --filter @guided-review/web sync:releases` to refresh the saved release
history after changing notes on GitHub. Commit `apps/web/data/releases.json`
when refreshing it locally. It is a generated snapshot for offline builds, not a
second place to edit release notes. Every website build attempts a fresh sync;
local builds fall back to the snapshot if GitHub is unavailable. Production
deployments set `RELEASES_SYNC_REQUIRED=true`, so a failed fetch or release missing
a descriptive title and opening summary stops the deploy. The existing site
stays live. Fix the release on GitHub and rerun Deploy.

`GITHUB_TOKEN` is optional for the public repository and increases API rate
limits when supplied. It is used only by the build-time sync, never by the browser.

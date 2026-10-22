# Guided Review auth.md

This document is for coding agents and clients that discover **guidedreview.dev**. Guided Review is a local-first code-review tool: its Chrome extension and CLI help a person walk an ordered set of review units. The site is public documentation, not an OAuth resource server.

## Registration and provisioning

Guided Review has no hosted agent-registration, account-provisioning, token-issuance, or credential-revocation endpoint. Do not send `POST /agent/auth` or similar registration requests to this site. Public discovery is read-only.

To use Guided Review, the person running the agent installs either the [Chrome extension](https://guidedreview.dev/docs/chrome-extension) or the [local CLI](https://guidedreview.dev/docs/cli). The CLI exposes its API only on the person's loopback interface after they start it; it is not available at guidedreview.dev.

## Supported methods

- **Anonymous public discovery:** Read this document, [llms.txt](https://guidedreview.dev/llms.txt), and the public documentation with ordinary HTTPS `GET` requests. No credential is required.
- **User-provisioned local use:** A person starts the CLI or opens the extension and chooses the review scope. Any local API access is limited to that person's machine and session.
- **Provider access:** The person supplies their own LLM-provider API key directly in the extension or CLI. Guided Review does not receive, register, or broker that key.

## Credentials and authority

There is no Guided Review bearer token, OAuth client registration, or agent identity assertion to request. An agent must not treat access to guidedreview.dev as authority to access a repository, local CLI server, GitHub account, or LLM-provider account.

Repository access and review submission in the extension use the person's explicit GitHub connection. LLM-provider credentials remain under the person's control and are used only for the provider they configure. For setup details, see [privacy and data](https://guidedreview.dev/docs/privacy-and-data).

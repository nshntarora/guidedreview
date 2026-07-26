export type HelpNavItem =
  | { type: "heading"; title: string }
  | { type?: undefined; slug: string; title: string; description?: string };

export const helpNavigation: HelpNavItem[] = [
  { type: "heading", title: "Getting Started" },
  {
    slug: "",
    title: "Introduction",
    description:
      "What Guided Review is, how it turns a GitHub PR into an ordered walkthrough, and where to start in the docs.",
  },
  {
    slug: "install",
    title: "Install the extension",
    description:
      "Install Guided Review from the Chrome Web Store or load an unpacked build for development.",
  },
  {
    slug: "first-review",
    title: "Your first review",
    description:
      "Open a GitHub PR, start Guided Review, walk review units, and leave comments from the overlay.",
  },
  { type: "heading", title: "Setup" },
  {
    slug: "configure-provider",
    title: "Configure AI provider",
    description:
      "Add your Anthropic, OpenAI, or Grok API key, pick a model, and test the connection in options.",
  },
  {
    slug: "connect-github",
    title: "Connect GitHub",
    description:
      "Optionally connect GitHub with device flow so you can submit reviews and line comments from the overlay.",
  },
  { type: "heading", title: "Product" },
  {
    slug: "how-it-works",
    title: "How a review plan works",
    description:
      "How Guided Review parses a PR diff, chunks large changes, and builds validated review units.",
  },
  {
    slug: "leave-comments",
    title: "Leave line comments",
    description:
      "Draft multi-line GitHub comments from the overlay while you walk the review plan.",
  },
  {
    slug: "submit-review",
    title: "Submit a review",
    description:
      "Post drafted comments and Comment, Approve, or Request Changes without leaving the overlay.",
  },
  {
    slug: "keyboard-shortcuts",
    title: "Keyboard shortcuts",
    description:
      "Keyboard-first shortcuts for overlay navigation, diff view, comments, and submitting a review.",
  },
  { type: "heading", title: "Help" },
  {
    slug: "troubleshooting",
    title: "Troubleshooting",
    description:
      "Fixes for a missing Start Guided Review button, provider errors, plan failures, and GitHub auth issues.",
  },
  {
    slug: "faq",
    title: "FAQ",
    description:
      "Answers about how Guided Review works, privacy, pricing, AI providers, and whether AI approves PRs.",
  },
  { type: "heading", title: "Trust" },
  {
    slug: "privacy-and-data",
    title: "Privacy & data",
    description:
      "What the extension sends to GitHub and your AI provider, what stays local, and website analytics.",
  },
];

export type HelpNavItem =
  { type: "heading"; title: string } | { type?: undefined; slug: string; title: string };

export const helpNavigation: HelpNavItem[] = [
  { type: "heading", title: "Getting Started" },
  { slug: "", title: "Introduction" },
  { slug: "install", title: "Install the extension" },
  { slug: "first-review", title: "Your first review" },
  { type: "heading", title: "Setup" },
  { slug: "configure-provider", title: "Configure AI provider" },
  { slug: "connect-github", title: "Connect GitHub" },
  { type: "heading", title: "Product" },
  { slug: "how-it-works", title: "How a review plan works" },
  { slug: "keyboard-shortcuts", title: "Keyboard shortcuts" },
  { type: "heading", title: "Trust" },
  { slug: "privacy-and-data", title: "Privacy & data" },
];

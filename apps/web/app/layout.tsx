import type { Metadata } from "next";
import { Newsreader, Victor_Mono } from "next/font/google";
import logoSvg from "@guided-review/ui/assets/logo.svg";
import Link from "next/link";
import { InstallButton, StarOnGitHubButton } from "../components/CtaButtons";
import { Footer } from "../components/Footer";
import { LineGutter } from "../components/LineGutter";
import { SiteShortcuts } from "../components/SiteShortcuts";
import "./globals.css";

const victorMono = Victor_Mono({
  subsets: ["latin"],
  variable: "--font-victor-mono",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  style: ["normal", "italic"],
  display: "swap",
});

const logoSrc = typeof logoSvg === "string" ? logoSvg : (logoSvg as { src: string }).src;

export const metadata: Metadata = {
  metadataBase: new URL("https://guidedreview.dev"),
  title: {
    default: "Guided Review",
    template: "%s · Guided Review",
  },
  description:
    "A better way for humans to review AI generated code. Clustered changes, summaries, keyboard-first — free, open source, bring your own LLM key.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Guided Review",
    description:
      "A better way for humans to review AI generated code. Clustered changes, summaries, keyboard-first — free, open source, bring your own LLM key.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Guided Review",
    description:
      "A better way for humans to review AI generated code. Clustered changes, summaries, keyboard-first — free, open source, bring your own LLM key.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${victorMono.variable} ${newsreader.variable}`}>
      <body className="min-h-screen antialiased">
        <LineGutter />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-gr-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-gr-accent-on"
        >
          Skip to content
        </a>
        <header className="sticky top-0 z-40 border-b border-gr-border bg-gr-chrome/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3.5 sm:gap-4 sm:px-6">
            <Link
              href="/"
              className="shrink-0 rounded-sm border-b-0 no-underline hover:border-b-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gr-accent"
              aria-label="Guided Review home"
            >
              <img
                src={logoSrc}
                alt="Guided Review"
                className="h-6 w-auto sm:h-7"
                width={350}
                height={49}
              />
            </Link>
            <nav
              className="flex shrink-0 items-center gap-2 text-base sm:gap-3 md:gap-5"
              aria-label="Primary"
            >
              <Link
                href="/#features"
                className="hidden text-gr-text hover:text-gr-accent md:inline"
              >
                Features
              </Link>
              <Link href="/docs" className="hidden text-gr-text hover:text-gr-accent md:inline">
                Docs
              </Link>
              <Link href="/#faqs" className="hidden text-gr-text hover:text-gr-accent md:inline">
                FAQ
              </Link>
              <StarOnGitHubButton size="sm" surface="overlay" compact />
              <InstallButton size="sm" surface="overlay" compact />
            </nav>
          </div>
        </header>
        <SiteShortcuts />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

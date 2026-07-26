import type { Metadata } from "next";
import { Victor_Mono } from "next/font/google";
import logoSvg from "@guided-review/ui/assets/logo.svg";
import Link from "next/link";
import { InstallButton, StarOnGitHubButton } from "../components/CtaButtons";
import { Footer } from "../components/Footer";
import { SiteShortcuts } from "../components/SiteShortcuts";
import "./globals.css";

const victorMono = Victor_Mono({
  subsets: ["latin"],
  variable: "--font-victor-mono",
  display: "swap",
});

const logoSrc = typeof logoSvg === "string" ? logoSvg : (logoSvg as { src: string }).src;

export const metadata: Metadata = {
  metadataBase: new URL("https://guidedreview.com"),
  title: {
    default: "Guided Review",
    template: "%s · Guided Review",
  },
  description:
    "AI-structured review plans for GitHub pull requests — walk through schema, logic, call-sites, and tests in order.",
  openGraph: {
    title: "Guided Review",
    description:
      "AI-structured review plans for GitHub pull requests — walk through schema, logic, call-sites, and tests in order.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Guided Review",
    description:
      "AI-structured review plans for GitHub pull requests — walk through schema, logic, call-sites, and tests in order.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={victorMono.variable}>
      <body className="min-h-screen antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-gr-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-gr-accent-on"
        >
          Skip to content
        </a>
        <header className="sticky top-0 z-40 border-b border-gr-border bg-gr-chrome/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3.5">
            <Link
              href="/"
              className="rounded-sm border-b-0 no-underline hover:border-b-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gr-accent"
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
            <nav className="flex items-center gap-5 text-base" aria-label="Primary">
              <Link
                href="/#features"
                className="hidden text-gr-text hover:text-gr-accent sm:inline"
              >
                Features
              </Link>
              <Link href="/#faqs" className="hidden text-gr-text hover:text-gr-accent sm:inline">
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

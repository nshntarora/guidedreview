import type { Metadata } from "next";
import { Victor_Mono } from "next/font/google";
import { buttonClassName } from "@guided-review/ui";
import logoSvg from "@guided-review/ui/assets/logo.svg";
import Link from "next/link";
import { GitHubIcon } from "../components/icons";
import "./globals.css";

const victorMono = Victor_Mono({
  subsets: ["latin"],
  variable: "--font-victor-mono",
  display: "swap",
});

const logoSrc = typeof logoSvg === "string" ? logoSvg : (logoSvg as { src: string }).src;

export const metadata: Metadata = {
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
              className="rounded-sm no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gr-accent"
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
            <nav className="flex items-center gap-5 text-base text-gr-muted" aria-label="Primary">
              <Link
                href="/#how-it-works"
                className="hidden transition-colors hover:text-gr-text sm:inline"
              >
                How it works
              </Link>
              <Link
                href="/#features"
                className="hidden transition-colors hover:text-gr-text sm:inline"
              >
                Features
              </Link>
              <a
                href="https://github.com/nshntarora/guidedreview"
                className={buttonClassName({
                  variant: "secondary",
                  size: "sm",
                  surface: "overlay",
                })}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Guided Review on GitHub"
              >
                <GitHubIcon className="h-4 w-4" />
                <span className="hidden sm:inline">GitHub</span>
              </a>
              <Link
                href="/#install"
                className={buttonClassName({ size: "sm", surface: "overlay" })}
              >
                Install
              </Link>
            </nav>
          </div>
        </header>
        <main id="main">{children}</main>
        <footer className="mt-16 border-t border-gr-border bg-gr-bg">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-gr-muted">
            <p className="m-0">© {new Date().getFullYear()} Guided Review</p>
            <div className="flex gap-4">
              <a
                href="https://github.com/nshntarora/guidedreview"
                className="transition-colors hover:text-gr-text"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
              <Link href="/privacy" className="transition-colors hover:text-gr-text">
                Privacy
              </Link>
              <Link href="/terms" className="transition-colors hover:text-gr-text">
                Terms
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

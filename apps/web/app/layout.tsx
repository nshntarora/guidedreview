import type { Metadata } from "next";
import { BrandMark } from "@guided-review/ui";
import iconPng from "@guided-review/ui/assets/icon.png";
import Link from "next/link";
import "./globals.css";

const iconSrc = typeof iconPng === "string" ? iconPng : (iconPng as { src: string }).src;

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
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-opt-border bg-opt-subtle">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
            <Link href="/" className="no-underline">
              <BrandMark iconSrc={iconSrc} className="mb-0" />
            </Link>
            <nav className="flex items-center gap-4 text-sm text-opt-muted" aria-label="Primary">
              <Link href="/#features" className="hover:text-opt-text">
                Features
              </Link>
              <Link href="/privacy" className="hover:text-opt-text">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-opt-text">
                Terms
              </Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="mt-16 border-t border-opt-border bg-opt-subtle">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-opt-muted">
            <p className="m-0">© {new Date().getFullYear()} Guided Review</p>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-opt-text">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-opt-text">
                Terms
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

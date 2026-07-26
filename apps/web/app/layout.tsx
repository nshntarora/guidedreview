import type { Metadata } from "next";
import { Newsreader, Victor_Mono } from "next/font/google";
import logoSvg from "@guided-review/ui/assets/logo.svg";
import Link from "next/link";
import { InstallButton, StarOnGitHubButton } from "../components/CtaButtons";
import { Footer } from "../components/Footer";
import { JsonLd } from "../components/JsonLd";
import { LineGutter } from "../components/LineGutter";
import { SiteShortcuts } from "../components/SiteShortcuts";
import { GITHUB_REPO_URL } from "../lib/links";
import { DEFAULT_DESCRIPTION, openGraphSite, SITE_NAME, SITE_URL } from "../lib/site";
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
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
  },
  // Do not hardcode openGraph/twitter title or description here — page-level
  // title and description cascade into share previews when these are omitted.
  openGraph: {
    ...openGraphSite,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.ico`,
  sameAs: [GITHUB_REPO_URL, "https://x.com/nshntarora"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${victorMono.variable} ${newsreader.variable}`}>
      <body className="min-h-screen antialiased">
        <JsonLd data={organizationSchema} />
        <LineGutter />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3.5 sm:gap-4 sm:px-6">
            <Link
              href="/"
              className="shrink-0 rounded-sm border-b-0 no-underline hover:border-b-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
                className="hidden text-foreground hover:text-primary md:inline"
              >
                Features
              </Link>
              <Link href="/docs" className="hidden text-foreground hover:text-primary md:inline">
                Docs
              </Link>
              <Link href="/#faqs" className="hidden text-foreground hover:text-primary md:inline">
                FAQ
              </Link>
              <StarOnGitHubButton size="sm" compact />
              <InstallButton size="sm" compact />
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

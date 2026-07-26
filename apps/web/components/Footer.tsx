"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GITHUB_REPO_URL } from "../lib/links";
import { Why } from "./Why";

export function Footer() {
  const pathname = usePathname();
  const showWhy = pathname === "/";

  return (
    <footer className="mt-16 border-t border-gr-border bg-gr-bg">
      <div className="mx-auto max-w-5xl px-6 py-12">
        {showWhy ? <Why /> : null}

        <div
          className={
            showWhy
              ? "mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-gr-border pt-8 text-sm text-gr-muted"
              : "flex flex-wrap items-center justify-between gap-3 text-sm text-gr-muted"
          }
        >
          <p className="m-0">© {new Date().getFullYear()} Guided Review</p>
          <div className="flex gap-4">
            <a
              href={GITHUB_REPO_URL}
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
            <Link href="/cookies" className="transition-colors hover:text-gr-text">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

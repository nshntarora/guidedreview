import Link from "next/link";
import { GITHUB_REPO_URL } from "../lib/links";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="flex flex-col items-start gap-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <p className="m-0">© {new Date().getFullYear()} Guided Review</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            <Link href="/docs">Docs</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/cookies">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

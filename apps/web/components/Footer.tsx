import Link from "next/link";
import { GITHUB_REPO_URL } from "../lib/links";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-gr-border bg-gr-bg">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gr-muted">
          <p className="m-0">© {new Date().getFullYear()} Guided Review</p>
          <div className="flex gap-4">
            <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/cookies">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

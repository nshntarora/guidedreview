import type { ReactNode } from "react";

type LegalDocumentProps = {
  title: string;
  /** Subtitle line under the title (effective date, entity, contact). */
  meta: ReactNode;
  children: ReactNode;
};

/**
 * Shared shell for Privacy / Terms / Cookies pages.
 * Keeps long formal legal copy readable within the marketing site tokens.
 */
export function LegalDocument({ title, meta, children }: LegalDocumentProps) {
  return (
    <article className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="m-0 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted">{meta}</p>
        <div className="legal-content mt-8 space-y-8 text-base leading-relaxed text-foreground">
          {children}
        </div>
      </div>
    </article>
  );
}

export function LegalContactBlock() {
  return (
    <div className="mt-4 rounded-lg border border-border bg-background/40 px-4 py-4 text-sm leading-relaxed text-muted">
      <strong className="text-foreground">Artery Ventures, LLP</strong>
      <br />
      FO-02, 4th Floor, 28/A, 80 Feet Rd
      <br />
      Indiranagar, Bengaluru, Karnataka 560038
      <br />
      India
      <br />
      <br />
      Email: <a href="mailto:support@guidedreview.dev">support@guidedreview.dev</a>
      <br />
      Website: <a href="https://guidedreview.dev">https://guidedreview.dev</a>
    </div>
  );
}

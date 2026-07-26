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
        <div className="legal-content mt-8 space-y-8 text-base leading-relaxed text-foreground [&_h2]:m-0 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:m-0 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_p]:m-0 [&_p]:mt-3 [&_p]:text-muted [&_ul]:m-0 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:text-muted [&_ol]:m-0 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_ol]:text-muted [&_li]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-foreground [&_code]:rounded [&_code]:bg-background [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_code]:text-foreground">
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

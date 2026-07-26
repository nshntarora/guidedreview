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
    <article className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="m-0 text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-opt-muted">{meta}</p>
      <div className="legal-content mt-8 space-y-8 text-base leading-relaxed text-opt-text [&_a]:underline [&_a]:decoration-opt-border [&_a]:underline-offset-2 hover:[&_a]:decoration-opt-accent [&_h2]:m-0 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:m-0 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_p]:m-0 [&_p]:mt-3 [&_p]:text-opt-muted [&_ul]:m-0 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:text-opt-muted [&_ol]:m-0 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_ol]:text-opt-muted [&_li]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-opt-text [&_code]:rounded [&_code]:bg-opt-chrome [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_code]:text-opt-text">
        {children}
      </div>
    </article>
  );
}

export function LegalContactBlock() {
  return (
    <div className="mt-4 rounded-lg border border-opt-border bg-opt-chrome/40 px-4 py-4 text-sm leading-relaxed text-opt-muted">
      <strong className="text-opt-text">Artery Ventures, LLP</strong>
      <br />
      FO-02, 4th Floor, 28/A, 80 Feet Rd
      <br />
      Indiranagar, Bengaluru, Karnataka 560038
      <br />
      India
      <br />
      <br />
      Email: <a href="mailto:support@guidedreview.com">support@guidedreview.com</a>
      <br />
      Website: <a href="https://guidedreview.com">https://guidedreview.com</a>
    </div>
  );
}

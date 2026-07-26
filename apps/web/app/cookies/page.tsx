import type { Metadata } from "next";
import { LegalDocument } from "../../components/LegalDocument";
import { openGraphSite } from "../../lib/site";

export const metadata: Metadata = {
  title: "Cookies Policy",
  description: "How Guided Review uses cookies and similar technologies on the marketing website.",
  alternates: { canonical: "/cookies" },
  openGraph: { ...openGraphSite, url: "/cookies" },
};

export default function CookiesPage() {
  return (
    <LegalDocument
      title="Cookies Policy"
      meta={
        <>
          Effective date: July 2026 &nbsp;·&nbsp; Artery Ventures, LLP &nbsp;·&nbsp;{" "}
          <a href="mailto:support@guidedreview.dev">support@guidedreview.dev</a>
        </>
      }
    >
      <section>
        <h2>Introduction</h2>
        <p>
          We, Artery Ventures, LLP (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;,
          &quot;our&quot;) may use cookies or similar technologies to understand how visitors use
          our website <a href="https://guidedreview.dev">https://guidedreview.dev</a>{" "}
          (&quot;Website&quot;). We are committed to protecting the privacy and security of your
          personal information. We advise you to carefully read this cookie policy
          (&quot;Policy&quot;), together with the Company&apos;s Privacy Policy at{" "}
          <a href="https://guidedreview.dev/privacy">guidedreview.dev/privacy</a>, so that you are
          aware of the cookies and technologies used as well as how we treat your personal
          information.
        </p>
        <p>
          This Policy applies to the Website. The Guided Review Chrome extension primarily uses
          browser extension storage (for example Chrome storage) for settings and review sessions
          rather than Website cookies. The Extension is not designed to set analytics cookies or
          send usage telemetry to us.
        </p>
      </section>

      <section>
        <h2>What are cookies?</h2>
        <p>
          Cookies are small text files which are placed on your device when you visit a website.
          They can allow a site to recognize your device, store preferences, analyze trends, operate
          and improve services, and provide a better experience.
        </p>
      </section>

      <section>
        <h2>Types of cookies</h2>
        <h3>By duration</h3>
        <p>
          <strong>Permanent (persistent) cookies</strong> — Remain on your device for a pre-defined
          period or until you delete them. They can help recognize returning visitors.
        </p>
        <p>
          <strong>Session cookies</strong> — Last only for the browsing session and are typically
          erased when you close the browser.
        </p>
        <h3>By domain</h3>
        <p>
          <strong>First-party cookies</strong> — Set by the Website you are visiting.
        </p>
        <p>
          <strong>Third-party cookies</strong> — Set by a domain other than the Website you are
          visiting (for example an analytics provider).
        </p>
      </section>

      <section>
        <h2>How we use cookies on the Website</h2>
        <p>
          We aim to keep Website tracking minimal. Depending on deployment and hosting
          configuration, the Website may use:
        </p>
        <h3>Essential / functional</h3>
        <p>
          Cookies or similar storage that are necessary for the Website to function securely and
          correctly (for example load balancing, security, or basic preferences). These are
          typically first-party and do not require advertising use.
        </p>
        <h3>Anonymous analytics</h3>
        <p>
          We may use an anonymous analytics script on the Website to understand aggregate traffic
          patterns—such as page views, approximate geography at a coarse level, and referring
          sources—so we can improve the marketing site. We configure analytics with the intent that
          it is anonymous or aggregated where the tool allows, and we do not use Website analytics
          to build a profile of Extension usage inside GitHub.
        </p>
        <p>
          The specific analytics provider may change over time. We do not currently rely on
          advertising pixels as a core part of the product. If we introduce additional tracking
          tools, we will update this Policy.
        </p>
        <h3>What we do not do with the Extension</h3>
        <p>
          The Extension does not send product analytics or telemetry to Artery Ventures as part of
          ordinary operation. It communicates with GitHub and with the LLM Provider you configure in
          order to provide review plans. See the Privacy Policy for details on that processing.
        </p>
      </section>

      <section>
        <h2>Use of information from cookies</h2>
        <p>Information from cookies and similar technologies may be used to:</p>
        <ul>
          <li>operate and secure the Website;</li>
          <li>understand how visitors navigate the Website;</li>
          <li>improve content, performance, and layout; and</li>
          <li>measure whether marketing pages are useful.</li>
        </ul>
        <p>
          We do not sell personal information collected via Website cookies. We do not use cookies
          on the Website to personalize third-party advertising as part of the current Guided Review
          product experience.
        </p>
      </section>

      <section>
        <h2>Disabling cookies</h2>
        <p>
          You can decide whether to accept cookies. Most browsers let you refuse or delete cookies
          via settings (see your browser&apos;s help documentation). Disabling cookies may affect
          Website functionality. You may also use browser privacy features, extensions, or
          provider-specific opt-outs where available for analytics tools.
        </p>
      </section>

      <section>
        <h2>Changes to this Policy</h2>
        <p>
          Please revisit this page periodically to stay aware of any changes to this Policy, which
          we may update from time to time. If we modify this Policy, we will make it available
          through the Website and indicate the date of the latest revision.
        </p>
      </section>

      <section>
        <h2>Contact us</h2>
        <p>
          If you have any questions or concerns regarding this Policy, you can contact us at{" "}
          <a href="mailto:support@guidedreview.dev">support@guidedreview.dev</a>.
        </p>
      </section>
    </LegalDocument>
  );
}

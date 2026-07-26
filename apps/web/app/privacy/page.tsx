import type { Metadata } from "next";
import { LegalContactBlock, LegalDocument } from "../../components/LegalDocument";
import { openGraphSite } from "../../lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Guided Review collects, uses, and protects personal data across the website and Chrome extension.",
  alternates: { canonical: "/privacy" },
  openGraph: { ...openGraphSite, url: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      meta={
        <>
          Last updated: July 2026 &nbsp;·&nbsp; Artery Ventures, LLP &nbsp;·&nbsp;{" "}
          <a href="mailto:support@guidedreview.dev">support@guidedreview.dev</a>
        </>
      }
    >
      <section>
        <p>
          We, Artery Ventures, LLP (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;,
          &quot;Company&quot;) are the owners of the website{" "}
          <a href="https://guidedreview.dev">guidedreview.dev</a> (&quot;Website&quot;) and the
          Guided Review Chrome browser extension (&quot;Extension&quot;). The Website and the
          Extension are collectively referred to as the &quot;Platform&quot;. The Website describes
          the Extension and its features. The Extension helps users structure GitHub pull request
          reviews with AI-assisted review plans (&quot;Services&quot;).
        </p>
        <p>
          We respect data privacy rights and are committed to protecting personal information
          collected on this Platform. This Privacy Policy (&quot;Privacy Policy&quot;) sets forth
          how we collect, use, and protect personal information in connection with the Platform.
        </p>
        <p>
          PLEASE READ THIS PRIVACY POLICY CAREFULLY. BY CONTINUING TO USE THE PLATFORM OR PROVIDING
          US PERSONAL INFORMATION, YOU CONSENT TO OUR USE OF YOUR PERSONAL INFORMATION IN ACCORDANCE
          WITH THE TERMS OF THIS PRIVACY POLICY. IF YOU DO NOT AGREE TO THIS PRIVACY POLICY, YOU MAY
          WITHDRAW YOUR CONSENT OR ALTERNATIVELY CHOOSE NOT TO PROVIDE YOUR PERSONAL INFORMATION ON
          THE PLATFORM. SUCH AN INTIMATION TO WITHDRAW YOUR CONSENT CAN BE PROVIDED BY EMAIL AT{" "}
          <a href="mailto:support@guidedreview.dev">support@guidedreview.dev</a>.
        </p>
        <p>
          IF YOU ARE ACCESSING THE PLATFORM ON BEHALF OF A THIRD PARTY, YOU REPRESENT THAT YOU HAVE
          THE AUTHORITY TO BIND SUCH THIRD PARTY TO THE TERMS AND CONDITIONS OF THIS PRIVACY POLICY
          AND, IN SUCH AN EVENT, YOUR USE OF THE PLATFORM SHALL REFER TO USE BY SUCH THIRD PARTY. IF
          YOU DO NOT HAVE SUCH AUTHORITY OR DO NOT AGREE TO THE TERMS OF THIS PRIVACY POLICY, THEN
          YOU SHOULD REFRAIN FROM USING THE PLATFORM.
        </p>
        <p>
          This Privacy Policy is an electronic record in the form of an electronic contract
          construed in accordance with applicable data protection laws.
        </p>
      </section>

      <section>
        <h2>1. Definitions</h2>
        <p>
          &quot;User(s)&quot;, &quot;you&quot;, &quot;your&quot; shall mean and include individuals,
          business organizations, commercial establishments, and their permitted users who use the
          Platform or may opt to share Personal Information in connection with the Services.
        </p>
        <p>
          &quot;UK Data Protection Law&quot; means the UK GDPR, the United Kingdom Data Protection
          Act 2018, the Privacy and Electronic Communications Regulations, and any regulation
          superseding any of the foregoing.
        </p>
        <p>
          &quot;LLM Provider&quot; means a third-party large language model service that you
          configure in the Extension (for example Anthropic, OpenAI, or xAI/Grok), including any
          compatible API endpoint you supply.
        </p>
      </section>

      <section>
        <h2>2. Personal information collected</h2>
        <p>
          For purposes of this Privacy Policy, &quot;Personal Information&quot; means information
          that can be used to personally identify the User, including but not limited to a
          User&apos;s name, email address, or similar identifiers.
        </p>
        <p>
          <strong>Personal Information collected on the Website</strong> — We may collect Personal
          Information from you when you (a) visit our Website, (b) contact us by email or other
          channels we publish, or (c) otherwise interact with materials on the Website. Information
          collected may include your name, email address, and the content of your message.
        </p>
        <p>
          <strong>Information processed by the Extension (on your device)</strong> — The Extension
          is designed to process data primarily on your device. When you use the Extension, the
          following may be stored locally in your browser via Chrome storage (including{" "}
          <code>chrome.storage.local</code> and <code>chrome.storage.session</code> as applicable):
        </p>
        <ul>
          <li>
            LLM Provider API keys, model preferences, and other settings you enter in the Extension
            options;
          </li>
          <li>
            optional GitHub authentication tokens obtained via device-flow authentication, so the
            Extension can call GitHub&apos;s API on your behalf (for example to submit review
            comments);
          </li>
          <li>
            review session data for pull requests you review (for example parsed diffs, review
            plans, and progress), keyed by pull request identity, so you can resume a session.
          </li>
        </ul>
        <p>
          This locally stored data is not transmitted to Artery Ventures servers as part of ordinary
          Extension operation. We do not operate a Guided Review backend that receives your API keys
          or stores your pull request content for the core review workflow.
        </p>
        <p>
          <strong>Pull request content and third-party processing</strong> — When you start a guided
          review, the Extension fetches the pull request diff from GitHub and sends that content
          (and related prompt context) to the LLM Provider you configured. That content is processed
          under that provider&apos;s terms and privacy policy. We do not control how your chosen LLM
          Provider stores or uses that data. You are responsible for ensuring you are authorized to
          share repository and pull request content with that provider.
        </p>
        <p>
          <strong>GitHub</strong> — Interactions with GitHub (fetching diffs, optional
          authentication, submitting reviews) are subject to GitHub&apos;s terms and privacy policy.
          Tokens and requests stay between your browser, GitHub, and (where you configured it) your
          LLM Provider.
        </p>
        <p>
          <strong>Social Media Platforms</strong> — If you contact us through social media platforms
          such as LinkedIn, Twitter/X, or others, we may receive your publicly available profile
          information such as your name, email, and handle.
        </p>
        <p>
          <strong>Log Data and Website analytics</strong> — When you visit the Website, our hosting
          infrastructure or browsers may automatically record technical information such as IP
          address, browser type, referring page, pages visited, and similar log data. We may also
          use anonymous analytics on the Website to understand aggregate traffic and improve the
          site. The Extension is not designed to send analytics or usage telemetry to us; it
          communicates with GitHub and your configured LLM Provider as described above. See our{" "}
          <a href="https://guidedreview.dev/cookies">Cookies Policy</a> for more detail.
        </p>
        <p>
          <strong>Payment Information</strong> — The Platform is currently offered without a paid
          subscription. If we later introduce paid features, payment card details would be handled
          by a third-party payment processor and not stored by us; we would update this Privacy
          Policy before collecting such information.
        </p>
      </section>

      <section>
        <h2>3. Cookies</h2>
        <p>
          The Website may use cookies and similar technologies, including for anonymous analytics
          and essential site operation. You may choose to disable cookies through your browser
          settings. For more information, please refer to our Cookies Policy at{" "}
          <a href="https://guidedreview.dev/cookies">guidedreview.dev/cookies</a>. The Extension
          primarily uses browser extension storage rather than website cookies for its settings and
          session data.
        </p>
      </section>

      <section>
        <h2>4. Accuracy of information</h2>
        <p>
          You shall be solely responsible for the accuracy, correctness, and truthfulness of the
          Personal Information you share with us, whether your own or that of a third party. If you
          share Personal Information on behalf of a third party, you represent that you have the
          necessary authority and have obtained appropriate consent from that third party. We shall
          not be responsible for verifying such authority or consent.
        </p>
      </section>

      <section>
        <h2>5. Use of personal information</h2>
        <p>We use Personal Information we collect for the following purposes:</p>
        <ul>
          <li>to respond to your requests and support inquiries;</li>
          <li>to operate, maintain, and improve the Website and Services;</li>
          <li>
            for creation or development of business intelligence or data analytics in relation to
            Website traffic (in aggregate or anonymous form where applicable);
          </li>
          <li>to manage our relationship with you;</li>
          <li>for internal record keeping; and</li>
          <li>to comply with our legal or statutory obligations.</li>
        </ul>
        <p>
          Local Extension settings, API keys, tokens, and review session data are used on your
          device to provide the Services you request. Transmission of pull request content to your
          LLM Provider is initiated by you when you run a guided review.
        </p>
      </section>

      <section>
        <h2>6. Disclosures</h2>
        <p>
          We do not sell, rent, share, distribute, lease, or otherwise provide your Personal
          Information to third parties without your prior consent, except in the following cases:
        </p>
        <p>
          <strong>Affiliates</strong> — We may provide your Personal Information to our affiliates
          to enable them to improve the Services and respond to queries.
        </p>
        <p>
          <strong>Service Providers</strong> — We may share Personal Information with service
          providers who work with us in connection with operating the Website (for example hosting
          or anonymous analytics providers). All such service providers are subject to
          confidentiality restrictions consistent with this Privacy Policy.
        </p>
        <p>
          <strong>LLM Providers and GitHub (your choices)</strong> — When you use the Extension,
          pull request content and API requests are sent to the LLM Provider you configure and to
          GitHub as needed to provide the Services. Those parties process data under their own
          policies. We are not responsible for their independent processing.
        </p>
        <p>
          <strong>Merger or Acquisition</strong> — We may transfer your Personal Information if we
          are acquired by another entity, merge with another company, or transfer part of our
          business to a third party. Any such third party that receives your Personal Information
          shall have the right to continue to use it in line with the purposes set out herein. We
          may notify you of such a transfer.
        </p>
        <p>
          <strong>Legal and Regulatory Authorities</strong> — We may disclose your Personal
          Information in order to comply with legal obligations, court orders, or requests by
          government authorities.
        </p>
      </section>

      <section>
        <h2>7. Data retention</h2>
        <p>
          Personal Information we hold (for example email correspondence or Website logs) is
          retained for as long as needed to provide the Services, respond to inquiries, comply with
          legal obligations, resolve disputes, and enforce our agreements.
        </p>
        <p>
          Data stored by the Extension in Chrome storage remains on your device until you clear it,
          uninstall the Extension, or otherwise remove it via Extension or browser controls. We do
          not control retention of data held by your LLM Provider or GitHub.
        </p>
      </section>

      <section>
        <h2>8. Security</h2>
        <p>
          We take reasonable measures to protect Personal Information we process in connection with
          the Website. The Extension relies on browser security and Chrome storage mechanisms; API
          keys and tokens stored locally can still be exposed if your device or browser profile is
          compromised. Although we and our providers use industry-standard protections where
          applicable, no method of transmission or storage is completely secure. You are responsible
          for safeguarding your device, browser profile, API keys, and GitHub credentials.
        </p>
      </section>

      <section>
        <h2>9. Your rights</h2>
        <p>
          You have the right to access Personal Information in our possession, the right to have us
          rectify or modify such Personal Information, the right to have us erase or delete your
          Personal Information, the right to restrict our processing of such Personal Information,
          the right to object to our use of Personal Information, and the right to withdraw consent
          at any time where we rely on consent to process your Personal Information. If you would
          like to exercise any of these rights regarding data we hold, please contact{" "}
          <a href="mailto:support@guidedreview.dev">support@guidedreview.dev</a>.
        </p>
        <p>
          For data stored only in your browser by the Extension, you can delete or modify it
          directly by clearing Extension storage, changing options, or uninstalling the Extension.
          For data held by an LLM Provider or GitHub, please use those providers&apos; account and
          privacy tools.
        </p>
      </section>

      <section>
        <h2>10. Choice and opt-out</h2>
        <p>
          We may send you communications if you contact us or if we later offer optional product
          updates or newsletters you opt into. You may opt out of promotional emails by following
          unsubscribe instructions in those emails, or by emailing{" "}
          <a href="mailto:support@guidedreview.dev">support@guidedreview.dev</a> with your request.
        </p>
      </section>

      <section>
        <h2>11. Information for EU and UK visitors</h2>
        <p>
          Residents of the European Union (&quot;EU&quot;) and United Kingdom (&quot;UK&quot;)
          should note that this Privacy Policy has been prepared with reference to the requirements
          of the EU General Data Protection Regulation (&quot;GDPR&quot;) and UK Privacy Laws. Where
          we determine the purposes and means of processing Personal Information collected via the
          Website, we act as a controller of that information.
        </p>
        <p>
          <strong>Legal Basis</strong> — We will not process your Personal Information without a
          lawful basis to do so. We will process your Personal Information only on the legal bases
          of consent, contract, or on the basis of our legitimate interests, provided that such
          interests are not overridden by your privacy rights and interests.
        </p>
        <p>
          <strong>Cross-border transfers</strong> — Personal Information of EU and UK residents may
          be processed outside the EU and UK (including by hosting or analytics providers, or by LLM
          Providers you choose). We collect and transfer Personal Information we control in
          accordance with applicable law. If you have questions, please contact{" "}
          <a href="mailto:support@guidedreview.dev">support@guidedreview.dev</a>.
        </p>
        <p>
          <strong>Your rights (EU and UK residents)</strong> — In addition to the rights described
          in Section 9, you have the right to lodge a complaint with a data protection authority. UK
          residents have the right to make a complaint to the Information Commissioner&apos;s Office
          (&quot;ICO&quot;) at <a href="https://www.ico.org.uk">www.ico.org.uk</a>. We would
          appreciate the chance to address your concerns before you approach the ICO, so please
          contact us first at <a href="mailto:support@guidedreview.dev">support@guidedreview.dev</a>
          .
        </p>
        <p>
          <strong>Governing Laws</strong> — For EU and UK residents, this Privacy Policy shall be
          governed respectively by the provisions of the GDPR and UK Privacy Laws to the extent they
          apply.
        </p>
      </section>

      <section>
        <h2>12. Links to other websites</h2>
        <p>
          Our Platform may contain links to other websites or applications (including GitHub, LLM
          Provider dashboards, and the Chrome Web Store). We do not control such third-party
          websites and are not responsible for the protection or privacy of any information you
          provide while visiting them. You should review the privacy policy applicable to any
          third-party website you visit.
        </p>
      </section>

      <section>
        <h2>13. Limitation of liability</h2>
        <p>
          To the extent permissible under law, we shall not be liable for any direct, indirect,
          incidental, special, consequential, or exemplary damages arising out of this Privacy
          Policy, including but not limited to damages for loss of profits, goodwill, data, or other
          intangible losses.
        </p>
      </section>

      <section>
        <h2>14. Children&apos;s privacy</h2>
        <p>
          This Platform is not intended for children under the age of 18. We do not knowingly
          collect Personal Information from children under the age of 18 without prior, verifiable
          consent of a legal representative. If you are under 18, please do not provide any Personal
          Information on this Platform. If a legal representative discovers that a child has
          provided us with Personal Information, please contact us at{" "}
          <a href="mailto:support@guidedreview.dev">support@guidedreview.dev</a> to have the
          information deleted.
        </p>
      </section>

      <section>
        <h2>15. Governing law and dispute resolution</h2>
        <p>
          Subject to applicable mandatory data-protection laws (including for EU and UK residents as
          described in Section 11), this Privacy Policy shall in all respects be governed by and
          construed in accordance with the laws of India. Any dispute arising under this Privacy
          Policy shall be subject to the exclusive jurisdiction of the courts in Mumbai,
          Maharashtra, India.
        </p>
      </section>

      <section>
        <h2>16. Changes to this policy</h2>
        <p>
          Please revisit this page periodically to stay aware of any changes to this Privacy Policy.
          If we modify this Privacy Policy, we will make it available through the Website and
          indicate the date of the latest revision. If such modifications materially alter your
          rights or obligations, we will make reasonable efforts to notify you via email (where we
          have your address) or through our Website.
        </p>
      </section>

      <section>
        <h2>17. Contact us</h2>
        <p>
          If you have any questions, concerns, or grievances about this Privacy Policy, or wish to
          withdraw your consent in relation to the processing of your Personal Information, please
          contact us at:
        </p>
        <LegalContactBlock />
      </section>
    </LegalDocument>
  );
}

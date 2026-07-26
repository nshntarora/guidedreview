import type { Metadata } from "next";
import { LegalContactBlock, LegalDocument } from "../../components/LegalDocument";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing use of the Guided Review Chrome extension and website.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      meta={
        <>
          Effective date: July 2026 &nbsp;·&nbsp; Artery Ventures, LLP &nbsp;·&nbsp;{" "}
          <a href="mailto:support@guidedreview.com">support@guidedreview.com</a>
        </>
      }
    >
      <section>
        <h2>1. Agreement to terms</h2>
        <p>
          These Terms of Use constitute a legally binding agreement made between you, whether
          personally or on behalf of an entity (&quot;you&quot;), and Artery Ventures, LLP
          (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), concerning your
          access to and use of the <a href="https://guidedreview.com">https://guidedreview.com</a>{" "}
          website and the Guided Review Chrome browser extension, as well as any other media form,
          media channel, mobile website, or application related, linked, or otherwise connected
          thereto (collectively, the &quot;Site&quot; or &quot;Service&quot;).
        </p>
        <p>
          You agree that by accessing the Site or installing or using the Extension, you have read,
          understood, and agree to be bound by all of these Terms of Use. IF YOU DO NOT AGREE WITH
          ALL OF THESE TERMS OF USE, THEN YOU ARE EXPRESSLY PROHIBITED FROM USING THE SITE AND YOU
          MUST DISCONTINUE USE IMMEDIATELY.
        </p>
        <p>
          Supplemental terms and conditions or documents that may be posted on the Site from time to
          time are hereby expressly incorporated herein by reference. We reserve the right, in our
          sole discretion, to make changes or modifications to these Terms of Use at any time and
          for any reason. We will alert you about any changes by updating the &quot;Last
          updated&quot; or &quot;Effective date&quot; of these Terms of Use. Your continued use of
          the Site after any revised Terms of Use are posted constitutes your acceptance of those
          changes.
        </p>
        <p>
          The Site is intended for users who are at least 18 years old. Persons under the age of 18
          are not permitted to use or register for the Site.
        </p>
      </section>

      <section>
        <h2>2. Description of service</h2>
        <p>
          Guided Review is a browser extension and related website that helps users structure
          reviews of GitHub pull requests. The Service may include, without limitation: injecting UI
          into GitHub pull request pages; fetching pull request diffs; sending diff content to a
          large language model provider that you configure; generating ordered review units and
          commentary; displaying an overlay walkthrough; optionally authenticating with GitHub so
          you can submit review comments; and related documentation on the Website.
        </p>
        <p>
          The Service is designed so that API keys, optional GitHub tokens, and review session data
          are stored in your browser. We do not operate a Guided Review backend that receives your
          API keys or stores your pull request content for the core review workflow. Processing of
          pull request content by your chosen LLM Provider is between you and that provider.
        </p>
        <p>
          We reserve the right to modify, suspend, or discontinue the Service (or any part thereof)
          at any time with or without notice. We shall not be liable to you or any third party for
          any modification, suspension, or discontinuation of the Service.
        </p>
      </section>

      <section>
        <h2>3. Intellectual property rights</h2>
        <p>
          Unless otherwise indicated, the Site (including branding, marketing copy, and non-source
          materials we publish) is our proprietary property, and the trademarks, service marks, and
          logos contained therein (the &quot;Marks&quot;) are owned or controlled by us or licensed
          to us, and are protected under applicable intellectual property laws of India and
          international conventions.
        </p>
        <p>
          Site content and the Marks are provided &quot;AS IS&quot; for your information and
          personal use only. Except as expressly provided in these Terms of Use, no part of the Site
          and no Marks may be copied, reproduced, aggregated, republished, uploaded, posted,
          publicly displayed, encoded, translated, transmitted, distributed, sold, licensed, or
          otherwise exploited for any commercial purpose whatsoever, without our express prior
          written permission.
        </p>
        <p>
          Provided that you are eligible to use the Site, you are granted a limited, non-exclusive,
          non-transferable license to access and use the Site and to install and use the Extension
          solely for your personal or internal business use, subject to these Terms. We reserve all
          rights not expressly granted to you.
        </p>
        <p>
          Separately from these Terms, source code for Guided Review may be made available on public
          repositories (for example on GitHub). Rights to use, modify, and redistribute that source
          code are governed by the applicable open-source license (if any) and notices in the
          repository, not solely by the limited Site license in this section. Trademarks and hosted
          branding for guidedreview.com are not licensed merely because source code is available.
        </p>
      </section>

      <section>
        <h2>4. User representations</h2>
        <p>By using the Site or Extension, you represent and warrant that:</p>
        <ol>
          <li>
            Any information you submit to us (for example support requests) will be true, accurate,
            current, and complete.
          </li>
          <li>You have the legal capacity and agree to comply with these Terms of Use.</li>
          <li>You are not a minor in the jurisdiction in which you reside.</li>
          <li>
            You will not access the Site through automated or non-human means, whether through a
            bot, script, or otherwise, except as expressly permitted by the Service or for
            legitimate open-source development and testing of the Extension itself.
          </li>
          <li>You will not use the Site or Extension for any illegal or unauthorized purpose.</li>
          <li>
            Your use of the Site and Extension will not violate any applicable law or regulation,
            including GitHub&apos;s terms and the terms of any LLM Provider you use.
          </li>
          <li>
            You are authorized to access the GitHub repositories and pull requests you process with
            the Extension, and to send related content to your configured LLM Provider.
          </li>
        </ol>
      </section>

      <section>
        <h2>5. Extension configuration and credentials</h2>
        <p>
          Certain features require you to supply credentials or configuration in the Extension, such
          as an LLM Provider API key and optional GitHub authentication. You agree to:
        </p>
        <ol>
          <li>Keep API keys, tokens, and other credentials confidential and secure.</li>
          <li>
            Use only credentials that you are authorized to use, and revoke or rotate them if
            compromised.
          </li>
          <li>
            Accept full responsibility for all use of the Extension under your browser profile and
            credentials, including charges incurred with your LLM Provider.
          </li>
          <li>
            Understand that we do not store your API keys on our servers as part of ordinary
            Extension operation, and that loss of local browser data may result in loss of settings
            or session progress.
          </li>
        </ol>
      </section>

      <section>
        <h2>6. Third-party services (GitHub and LLM Providers)</h2>
        <p>
          The Service depends on third-party platforms. By using the Extension, you acknowledge
          that:
        </p>
        <ol>
          <li>
            Pull request diffs and related context are fetched from GitHub and may be sent to the
            LLM Provider you configure to generate review plans.
          </li>
          <li>
            We do not claim ownership over your code, pull request content, or any intellectual
            property contained therein.
          </li>
          <li>
            You are solely responsible for ensuring that sharing repository or pull request content
            with an LLM Provider does not violate employer policies, confidentiality agreements, or
            third-party rights.
          </li>
          <li>
            Optional GitHub device-flow authentication enables the Extension to act on your behalf
            within the scopes granted; you may revoke access through GitHub or by clearing Extension
            storage.
          </li>
          <li>
            Availability, accuracy, pricing, data retention, and privacy practices of GitHub and LLM
            Providers are governed solely by those third parties. We are not responsible for
            outages, policy changes, model errors, or data handling by those services.
          </li>
        </ol>
      </section>

      <section>
        <h2>7. AI-generated content disclaimer</h2>
        <p>
          Review plans, summaries, ordering, and other outputs generated with the assistance of LLM
          Providers are probabilistic and may be incomplete, incorrect, or misleading. The Service
          is a productivity aid for human reviewers; it does not replace professional judgment,
          security review, or compliance review. You are solely responsible for any review comments
          you submit and any decisions you make based on AI-generated guidance.
        </p>
      </section>

      <section>
        <h2>8. Fees and payment</h2>
        <p>
          The Service is currently offered without a fee charged by us. You remain responsible for
          any costs charged by third parties you use with the Extension, including LLM Provider
          usage fees and GitHub or browser-related costs. We reserve the right to introduce paid
          features or tiers in the future; if we do, we will update these Terms and disclose
          applicable pricing before charging you.
        </p>
      </section>

      <section>
        <h2>9. Prohibited activities</h2>
        <p>
          You may not access or use the Site for any purpose other than that for which we make the
          Site available. As a user of the Site or Extension, you agree not to:
        </p>
        <ol>
          <li>
            Use the Service to access, process, or transmit code or pull request content for which
            you do not have authorization.
          </li>
          <li>
            Use the Service to exfiltrate secrets, credentials, or personal data you are not
            authorized to process, or to bypass security or access controls.
          </li>
          <li>
            Attempt to reverse engineer, decompile, disassemble, or otherwise derive proprietary
            non-open portions of the Service solely to create a competing commercial product, except
            to the extent such restriction is prohibited by applicable law or permitted by an
            open-source license covering the relevant code.
          </li>
          <li>
            Systematically retrieve data or other content from the Site to create or compile a
            collection, compilation, database, or directory without written permission from us.
          </li>
          <li>
            Make any unauthorized use of the Site, including collecting usernames or email addresses
            by electronic or other means for the purpose of sending unsolicited email.
          </li>
          <li>
            Circumvent, disable, or otherwise interfere with security-related features of the Site
            or Extension.
          </li>
          <li>
            Interfere with, disrupt, or create an undue burden on the Site or the networks or
            services connected to the Site.
          </li>
          <li>
            Attempt to impersonate another user or person, or misrepresent your affiliation with any
            person or entity.
          </li>
          <li>
            Use any information obtained from the Site to harass, abuse, or harm another person.
          </li>
          <li>
            Upload or transmit viruses, Trojan horses, or other malicious material that interferes
            with any party&apos;s use and enjoyment of the Site.
          </li>
          <li>
            Use the Site in a manner inconsistent with any applicable laws or regulations, including
            but not limited to the Information Technology Act, 2000 (India) and its rules and
            amendments.
          </li>
        </ol>
      </section>

      <section>
        <h2>10. User generated contributions</h2>
        <p>
          The Site may allow you to submit feedback, suggestions, bug reports, or other content
          (collectively, &quot;Contributions&quot;). When you create or make available any
          Contributions, you represent and warrant that your Contributions are not false,
          inaccurate, or misleading, do not violate the intellectual property rights of any third
          party, and comply with applicable law.
        </p>
        <p>
          We have the right, in our sole and absolute discretion, to edit, redact, or otherwise
          change any Contributions, or to remove any Contributions at any time and for any reason,
          without notice.
        </p>
      </section>

      <section>
        <h2>11. Contribution license</h2>
        <p>
          By posting your Contributions to the Site or sending them to us, you grant us an
          unrestricted, unlimited, irrevocable, perpetual, non-exclusive, transferable,
          royalty-free, fully-paid, worldwide right and license to use, copy, reproduce, disclose,
          distribute, and prepare derivative works of such Contributions for any purpose, commercial
          or otherwise, including improving the Service.
        </p>
        <p>
          You retain full ownership of all of your Contributions and any intellectual property
          rights associated with your Contributions. We do not assert ownership over your code or
          pull request content merely because you used the Extension.
        </p>
      </section>

      <section>
        <h2>12. Submissions</h2>
        <p>
          Any questions, comments, suggestions, ideas, feedback, or other information regarding the
          Site (&quot;Submissions&quot;) provided by you to us are non-confidential and shall become
          our sole property to the extent permitted by law. We shall own exclusive rights, including
          all intellectual property rights, and shall be entitled to the unrestricted use and
          dissemination of these Submissions for any lawful purpose, without acknowledgment or
          compensation to you. This section does not transfer ownership of open-source contributions
          you make under a separate license agreement or pull request to a public repository, which
          remain governed by that repository&apos;s contribution terms and license.
        </p>
      </section>

      <section>
        <h2>13. Third-party websites and content</h2>
        <p>
          The Site and Extension may contain links to or integrate with third-party websites and
          services, including GitHub, LLM Provider APIs, and the Chrome Web Store (&quot;Third-Party
          Websites&quot;). Such Third-Party Websites are not investigated, monitored, or checked for
          accuracy, appropriateness, or completeness by us. We are not responsible for any
          Third-Party Websites accessed through the Site or Extension. Your use of Third-Party
          Websites is governed solely by the terms and policies of those third parties.
        </p>
      </section>

      <section>
        <h2>14. Site management</h2>
        <p>
          We reserve the right to: (1) monitor the Site for violations of these Terms of Use; (2)
          take appropriate legal action against anyone who, in our sole discretion, violates the law
          or these Terms of Use; (3) refuse, restrict access to, limit the availability of, or
          disable any of your Contributions or any portion thereof; and (4) otherwise manage the
          Site in a manner designed to protect our rights and property and to facilitate the proper
          functioning of the Site.
        </p>
      </section>

      <section>
        <h2>15. Privacy policy</h2>
        <p>
          We care about data privacy and security. Please review our Privacy Policy at{" "}
          <a href="https://guidedreview.com/privacy">https://guidedreview.com/privacy</a>. By using
          the Site, you agree to be bound by our Privacy Policy, which is incorporated into these
          Terms of Use. The Site may be hosted on servers located outside India. If you access the
          Site from any region with laws governing personal data collection, use, or disclosure that
          differ from applicable Indian laws, you agree to your data being transferred to and
          processed in such locations to the extent necessary to operate the Site.
        </p>
      </section>

      <section>
        <h2>16. Data protection and repository content</h2>
        <p>
          You acknowledge and agree that to the extent any personal data or proprietary code is
          processed through the Service:
        </p>
        <ol>
          <li>
            You shall ensure you have the right to process and share such data or code with GitHub
            and your configured LLM Provider, and that doing so does not violate any third-party
            rights or confidentiality obligations.
          </li>
          <li>
            We will handle Personal Information we control in accordance with our Privacy Policy and
            applicable data protection laws, including the Digital Personal Data Protection Act,
            2023 (India) as applicable.
          </li>
          <li>
            You are solely responsible for ensuring that pull requests and repositories you process
            do not cause unauthorized disclosure of secrets, personal data, or third-party
            confidential information to LLM Providers.
          </li>
          <li>
            If any government authority or court of competent jurisdiction requires us to disclose
            data we hold, we shall have the right to do so in accordance with applicable law.
          </li>
        </ol>
      </section>

      <section>
        <h2>17. Term and termination</h2>
        <p>
          These Terms of Use shall remain in full force and effect while you use the Site or
          Extension. You may stop using the Service at any time by uninstalling the Extension and
          discontinuing use of the Site. We reserve the right to, in our sole discretion and without
          notice or liability, deny access to and use of the Site (including blocking certain IP
          addresses) for any reason, including breach of these Terms of Use or any applicable law or
          regulation.
        </p>
      </section>

      <section>
        <h2>18. Modifications and interruptions</h2>
        <p>
          We reserve the right to change, modify, or remove the contents of the Site at any time or
          for any reason at our sole discretion without notice. We also reserve the right to modify
          or discontinue all or part of the Site without notice at any time. We will not be liable
          to you or any third party for any modification, suspension, or discontinuance of the Site.
        </p>
        <p>
          We cannot guarantee the Site or Extension will be available at all times. GitHub, Chrome,
          LLM Providers, or our hosting may experience problems resulting in interruptions, delays,
          or errors. Nothing in these Terms of Use will be construed to obligate us to maintain and
          support the Site or Extension or to supply any corrections, updates, or releases in
          connection therewith.
        </p>
      </section>

      <section>
        <h2>19. Governing law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of India.
          Artery Ventures, LLP and you irrevocably consent that the courts of competent jurisdiction
          in Mumbai, Maharashtra, India shall have exclusive jurisdiction to resolve any dispute
          which may arise in connection with these Terms.
        </p>
      </section>

      <section>
        <h2>20. Dispute resolution</h2>
        <p>
          To expedite resolution and control the cost of any dispute, controversy, or claim related
          to these Terms of Use (each a &quot;Dispute&quot;), the parties agree to first attempt to
          negotiate any Dispute informally for at least thirty (30) days before initiating formal
          legal proceedings. Such informal negotiations commence upon written notice from one party
          to the other.
        </p>
        <p>
          If informal negotiations fail to resolve a Dispute, the parties agree to submit to the
          exclusive jurisdiction of the courts in Mumbai, Maharashtra, India. Notwithstanding the
          foregoing, either party may seek injunctive or other equitable relief in any court of
          competent jurisdiction to prevent the actual or threatened infringement of intellectual
          property rights.
        </p>
      </section>

      <section>
        <h2>21. Disclaimer</h2>
        <p>
          THE SITE AND EXTENSION ARE PROVIDED ON AN AS-IS AND AS-AVAILABLE BASIS. YOU AGREE THAT
          YOUR USE OF THE SITE AND OUR SERVICES WILL BE AT YOUR SOLE RISK. TO THE FULLEST EXTENT
          PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, IN CONNECTION WITH THE
          SITE AND YOUR USE THEREOF, INCLUDING, WITHOUT LIMITATION, THE IMPLIED WARRANTIES OF
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE MAKE NO
          WARRANTIES OR REPRESENTATIONS ABOUT THE ACCURACY OR COMPLETENESS OF THE SITE&apos;S
          CONTENT OR THE ACCURACY OF ANY REVIEW PLAN, SUMMARY, ORDERING, COMMENTARY, OR OTHER OUTPUT
          GENERATED WITH THE ASSISTANCE OF LLM PROVIDERS.
        </p>
      </section>

      <section>
        <h2>22. Limitations of liability</h2>
        <p>
          IN NO EVENT WILL WE OR OUR DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE TO YOU OR ANY THIRD
          PARTY FOR ANY DIRECT, INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE
          DAMAGES, INCLUDING LOST PROFIT, LOST REVENUE, LOSS OF DATA, OR OTHER DAMAGES ARISING FROM
          YOUR USE OF THE SITE OR THE SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF
          SUCH DAMAGES. NOTWITHSTANDING ANYTHING TO THE CONTRARY CONTAINED HEREIN, OUR LIABILITY TO
          YOU FOR ANY CAUSE WHATSOEVER WILL AT ALL TIMES BE LIMITED TO THE GREATER OF (A) THE AMOUNT
          PAID, IF ANY, BY YOU TO US IN THE THREE (3) MONTHS PRECEDING THE EVENT GIVING RISE TO THE
          CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS (USD $100), TO THE EXTENT SUCH LIMITATION IS
          PERMITTED BY LAW.
        </p>
        <p>
          WE ARE NOT LIABLE FOR ANY LOSS OR DAMAGE ARISING FROM UNAUTHORIZED ACCESS TO YOUR BROWSER
          PROFILE, API KEYS, OR GITHUB ACCOUNT; FROM YOUR DISCLOSURE OF CODE OR SECRETS TO LLM
          PROVIDERS; FROM INACCURACIES IN AI-GENERATED REVIEW GUIDANCE; OR FROM OUTAGES OR ACTIONS
          OF THIRD-PARTY SERVICES CONNECTED TO THE SITE OR EXTENSION.
        </p>
      </section>

      <section>
        <h2>23. Indemnification</h2>
        <p>
          You agree to defend, indemnify, and hold us harmless, including our subsidiaries,
          affiliates, officers, agents, partners, and employees, from and against any loss, damage,
          liability, claim, or demand, including reasonable attorneys&apos; fees and expenses, made
          by any third party due to or arising out of: (1) your Contributions; (2) use of the Site
          or Extension; (3) breach of these Terms of Use; (4) any breach of your representations and
          warranties set forth in these Terms of Use; (5) your violation of the rights of a third
          party, including intellectual property rights; or (6) your unauthorized sharing of
          third-party code, secrets, or personal data through the Service or with LLM Providers.
        </p>
      </section>

      <section>
        <h2>24. Electronic communications, transactions, and signatures</h2>
        <p>
          Visiting the Site, sending us emails, and completing online forms constitute electronic
          communications. You consent to receive electronic communications, and you agree that all
          agreements, notices, disclosures, and other communications we provide to you
          electronically, via email and on the Site, satisfy any legal requirement that such
          communication be in writing, to the extent permitted by applicable law.
        </p>
      </section>

      <section>
        <h2>25. Corrections</h2>
        <p>
          There may be information on the Site that contains typographical errors, inaccuracies, or
          omissions, including descriptions, availability, and various other information. We reserve
          the right to correct any errors, inaccuracies, or omissions and to change or update the
          information on the Site at any time, without prior notice.
        </p>
      </section>

      <section>
        <h2>26. Miscellaneous</h2>
        <p>
          These Terms of Use and any policies or operating rules posted by us on the Site constitute
          the entire agreement and understanding between you and us. Our failure to exercise or
          enforce any right or provision of these Terms of Use shall not operate as a waiver of such
          right or provision. If any provision or part of a provision of these Terms of Use is
          determined to be unlawful, void, or unenforceable, that provision or part of the provision
          is deemed severable from these Terms of Use and does not affect the validity and
          enforceability of any remaining provisions. There is no joint venture, partnership,
          employment, or agency relationship created between you and us as a result of these Terms
          of Use or use of the Site.
        </p>
      </section>

      <section>
        <h2>27. Contact us</h2>
        <p>
          To resolve a complaint regarding the Site or to receive further information regarding use
          of the Site, please contact us at:
        </p>
        <LegalContactBlock />
      </section>
    </LegalDocument>
  );
}

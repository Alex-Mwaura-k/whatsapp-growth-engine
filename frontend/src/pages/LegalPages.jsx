import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const effectiveDate = import.meta.env.VITE_EFFECTIVE_DATE;
const privacyEmail = import.meta.env.VITE_PRIVACY_EMAIL || import.meta.env.VITE_SUPPORT_EMAIL;

function LegalPage({ title, children }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 font-sans dark:bg-slate-950">
      <SEO 
        title={title} 
        description={`Read the official ${title} for Growth Engine.`} 
      />
      <article className="mx-auto max-w-[1300px] rounded-2xl border border-gray-100 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-10">
        <div className="flex justify-between text-sm font-bold text-blue-600">
          <Link to="/" className="hover:underline">
            Home page
          </Link>
          <Link to="/register" className="hover:underline">
            Registration Page
          </Link>
        </div>
        <header className="mb-8 mt-5 border-b border-gray-100 pb-6 dark:border-slate-800">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">{title}</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            RA_Technologies · Effective {effectiveDate}
          </p>
        </header>
        <div className="space-y-7 text-sm leading-7 text-gray-700 dark:text-gray-300">
          {children}
        </div>
        <footer className="mt-10 border-t border-gray-100 pt-5 text-center text-sm text-gray-500 dark:border-slate-800 dark:text-gray-400">
          Questions or privacy requests? Contact{' '}
          <a className="font-bold text-blue-600 hover:underline" href={`mailto:${privacyEmail}`}>
            {privacyEmail}
          </a>
          .
        </footer>
      </article>
    </main>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-extrabold text-gray-900 dark:text-white">{title}</h2>
      <div>{children}</div>
    </section>
  );
}

export function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        These terms explain how you may use the Growth Engine networking and contact-matching
        service operated by RA_Technologies (“we”, “us”). By creating an account, you agree to
        these terms. Registration is an invitation to participate; you choose whether to join a
        pool, what profile details to provide, and whether to unlock a matched contact batch.
      </p>

      <Section title="1. Who may participate">
        <p>
          You must be at least 18, able to form a binding agreement, and provide accurate
          registration details. Use one account for yourself, keep your password confidential,
          and tell us promptly if you suspect unauthorized access.
        </p>
      </Section>

      <Section title="2. Joining pools and sharing contact details">
        <p>
          Joining a pool is an affirmative request to be matched with other participating members.
          To make that exchange work, your submitted profile information and contact details may be
          included in another matched member's contact file when that member unlocks the batch.
          Likewise, unlocking a batch gives you the contact details that participating members
          chose to make available through the service. Review the Privacy Policy before joining.
          Do not join or unlock a batch unless you understand and accept this reciprocal contact
          exchange.
        </p>
      </Section>

      <Section title="3. Invitations and referrals">
        <p>
          You may invite people to participate using your referral link or code. An invitation
          should be sent only to people you know or reasonably expect would welcome it. Do not
          spam, mislead, pressure, or claim that someone has agreed to join just because you sent
          them an invitation. A referral reward is conditional on the published program rules and
          qualifying activity; it is not guaranteed income.
        </p>
      </Section>

      <Section title="4. Acceptable use and your responsibilities">
        <p>
          Use contact details lawfully, respectfully, and for legitimate networking. You must
          obtain any permission required before adding a contact to marketing lists or messaging
          them. Do not harass, threaten, impersonate, scrape, resell, or misuse members' information;
          do not use the service for unlawful discrimination, fraud, spam, or unlawful marketing.
          Respect applicable privacy and communications laws and the rules of any messaging
          platform you use.
        </p>
      </Section>

      <Section title="5. Profiles, matches, and availability">
        <p>
          You are responsible for the information you submit and for keeping it reasonably current.
          We facilitate matching but do not verify every profile, guarantee a particular match,
          response, business outcome, contact quality, uninterrupted availability, or that another
          member will act as represented. Use your own judgment before contacting or doing business
          with someone you meet through the service.
        </p>
      </Section>

      <Section title="6. Tokens, prices, and payments">
        <p>
          The price, available token discount, and amount due are shown before checkout. A batch's
          price is determined by the platform phase recorded when that batch becomes ready.
          Referral tokens are an in-app discount balance, not cash, and cannot be transferred or
          redeemed except where we expressly state otherwise. Payment requests are processed
          through M-Pesa/Daraja. Do not repeat a payment while its status is uncertain; check the
          transaction status and contact us with the transaction reference. Any refund or payment
          dispute will be handled under applicable law and the relevant payment provider's rules.
        </p>
      </Section>

      <Section title="7. Account suspension and closure">
        <p>
          You may stop participating and request account deletion through the available account
          controls or by contacting us. Deleting your account removes it and linked records from
          the active application database, subject to records that must lawfully be retained and
          copies already held by other members. We may restrict or suspend access where reasonably needed
          to protect members, investigate misuse, comply with law, or maintain service security.
        </p>
      </Section>

      <Section title="8. Security and incidents">
        <p>
          We use reasonable safeguards appropriate to the service, but no online service or storage
          system can be guaranteed completely secure. We will handle personal data incidents and
          required notifications in accordance with applicable law. These terms do not waive your
          statutory privacy rights or excuse obligations that cannot lawfully be excluded.
        </p>
      </Section>

      <Section title="9. Disclaimers and limits">
        <p>
          To the extent permitted by applicable law, the service is provided as available, and we
          are not responsible for a member's independent conduct, the accuracy of user-submitted
          profiles, network or payment-provider outages, or indirect losses outside our reasonable
          control. Nothing in these terms excludes liability for fraud, wilful misconduct, or any
          liability or consumer right that the law does not allow us to exclude or limit. This
          section is not a promise that no claim can be brought.
        </p>
      </Section>

      <Section title="10. Changes and governing law">
        <p>
          We may update these terms to reflect service or legal changes. We will publish the
          current version and, where required, ask you to accept material changes before continued
          use. These terms are initially intended for users in Kenya and are subject to applicable
          Kenyan law, including mandatory consumer and data-protection rights. If the service
          expands to other countries, applicable mandatory local protections continue to apply.
        </p>
      </Section>
    </LegalPage>
  );
}

export function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        RA_Technologies operates Growth Engine initially for users in Kenya. This notice describes
        what personal data the service handles, why it is used, and the choices available to you.
        Creating an account acknowledges that you have read this notice; specific use of matching
        is initiated by you when you choose to join a pool.
      </p>

      <Section title="1. Information we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>Account details: phone number, WhatsApp display name, password credential, and any email you provide.</li>
          <li>Profile information: name, age range, gender, country, county/state, business category, bio, and profile picture.</li>
          <li>Participation details: pool type, filters, referrals, matches, contact unlocks, and download activity.</li>
          <li>Balances and payment records: token balance and history, M-Pesa phone number, amount, status, receipt/reference, and callback data needed to verify payment.</li>
          <li>Technical and security information generated by the service, such as session and request data needed to operate, protect, and troubleshoot the app.</li>
        </ul>
        <p className="mt-2">
          Passwords are handled as authentication credentials and are not intended to be stored as
          readable text. Do not put sensitive personal information in your profile or bio.
        </p>
      </Section>

      <Section title="2. How we use information">
        <p>
          We use this information to create and secure accounts; provide profile, referral,
          matching, contact-file, and payment features; calculate token discounts; prevent fraud
          and duplicate rewards; respond to support requests; maintain service reliability; and
          meet legal obligations. We do not promise that every profile or match is independently
          verified.
        </p>
      </Section>

      <Section title="3. What other members can see">
        <p>
          When you join a pool, you ask us to use your selected profile attributes for matching.
          If a matched member unlocks the batch, the contact file may disclose the profile and
          contact details you submitted, including your phone number, WhatsApp name, category,
          location, and bio. The service may show only limited or masked details before unlock.
          Once another member has received a contact file, we cannot remotely erase a copy they
          already downloaded. Share only information you are comfortable making available in this
          way.
        </p>
      </Section>

      <Section title="4. When we share data">
        <p>
          We share relevant data with matched members as described above; with Safaricom/M-Pesa and
          payment service providers to initiate and confirm payments; with hosting, storage, email,
          and technical providers needed to run the service; and with authorities or other parties
          when required by law or necessary to protect rights, safety, and service security.
          Providers should receive only the information needed for their service and are subject
          to appropriate safeguards. We do not sell personal information as a business model.
        </p>
      </Section>

      <Section title="5. Storage, security, and international processing">
        <p>
          We apply reasonable technical and organizational safeguards, including access controls
          and protected authentication. No method of transmission or storage is perfectly secure,
          so we cannot promise absolute security. Service providers may process or store data
          outside Kenya; where that occurs, we will use safeguards required by applicable law.
          We will handle reportable incidents and notices as required by law.
        </p>
      </Section>

      <Section title="6. Retention and deletion">
        <p>
          We keep account and profile information while your account is active and as needed to
          provide the service. Payment, security, referral, and dispute records may be retained
          longer where needed for legitimate operational purposes or legal obligations. You can
          request account deletion, which removes your account and linked records from the active
          application database. This cannot retract contact files already downloaded by other
          members. Backups or technical logs, if any, may take time to expire through normal
          maintenance, and records may be retained where the law requires it.
        </p>
      </Section>

      <Section title="7. Your choices and rights">
        <p>
          You can review and update supported profile fields in the app, choose whether to join a
          pool, and request access, correction, objection, restriction, or deletion of personal
          data by contacting us. Requests are handled under applicable law, including Kenya’s Data
          Protection Act, 2019. We may need to verify your identity and may retain information
          where lawful. You may also complain to the Office of the Data Protection Commissioner
          in Kenya.
        </p>
      </Section>

      <Section title="8. Children">
        <p>
          The service is intended for people aged 18 and older. We do not knowingly invite
          children to create accounts. Contact us if you believe a person under 18 has provided
          personal data so we can review and take appropriate action.
        </p>
      </Section>

      <Section title="9. Policy changes and contact">
        <p>
          We will publish the current policy here and update its effective date when it changes.
          Material changes will be presented for renewed acknowledgement or consent where required.
          Contact RA_Technologies at {privacyEmail} for privacy questions or requests.
        </p>
      </Section>
    </LegalPage>
  );
}
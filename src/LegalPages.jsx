// Legal content should be reviewed by a qualified legal professional before production use.
const LEGAL_COPY = {
  'refund-policy': {
    eyebrow: 'Refund Policy',
    title: 'Refund Policy',
    updated: 'Last updated: June 1, 2026',
    sections: [
      ['General Policy', 'We offer a 14-day money-back guarantee for all new subscriptions.'],
      ['Cancellations', 'You may cancel your subscription at any time. Cancellations take effect at the end of the current billing cycle.'],
      ['Contact', 'For refund requests, please contact support@trinetr.com.']
    ]
  },
  'cookie-policy': {
    eyebrow: 'Cookie Policy',
    title: 'Cookie Policy',
    updated: 'Last updated: June 1, 2026',
    sections: [
      ['Essential Cookies', 'We use essential cookies to maintain your login session and secure your account.'],
      ['Analytics Cookies', 'If you consent, we use anonymous analytics to understand feature usage and improve the product.'],
      ['Managing Cookies', 'You can disable analytics tracking from your Profile Settings at any time.']
    ]
  },
  'acceptable-use': {
    eyebrow: 'Acceptable Use',
    title: 'Acceptable Use Policy',
    updated: 'Last updated: June 1, 2026',
    sections: [
      ['Prohibited Activities', 'You may not use Trinetr Business Suite for any illegal, abusive, or fraudulent activities.'],
      ['Fair Use', 'API usage and automated access are subject to fair use limits to ensure stability for all users.'],
      ['Enforcement', 'Violation of this policy may result in immediate account suspension or termination.']
    ]
  },
  'trust-center': {
    eyebrow: 'Trust Center',
    title: 'Trust & Security',
    updated: 'Last updated: June 1, 2026',
    sections: [
      ['Data Security', 'Designed with security best practices in mind. All data is encrypted in transit and at rest.'],
      ['User Privacy', 'We never sell your business data. Your privacy is a core principle.'],
      ['Account Protection', 'We utilize modern authentication standards and role-based access control (RBAC).'],
      ['Supabase Secure Backend', 'Our infrastructure is backed by Supabase, providing enterprise-grade row-level security.'],
      ['Data Ownership', 'Your data belongs to you. You can export or request full deletion of your records at any time.'],
      ['Backups & Audit Logs', 'System activity is logged and core databases are backed up automatically to prevent data loss.'],
      ['Responsible AI Use', 'AI processing is strictly opt-in and limited to transactional context. We do not use your private data to train public models.'],
      ['Contact Security Team', 'Report vulnerabilities or security concerns to security@trinetr.com.']
    ]
  },
  'privacy-policy': {
    eyebrow: 'Privacy Policy',
    title: 'Privacy Policy',
    updated: 'Last updated: June 1, 2026',
    sections: [
      ['Microphone Permission', 'The microphone is used only when you tap the voice button. Speech is converted into a transcript so the app can prepare a transaction review screen. Voice input is not recorded continuously.'],
      ['Business Data Storage', 'Your business entries, invoices, ledgers, inventory, customers, suppliers, and reports may be stored in Supabase under your user account when Supabase is configured. Demo mode is limited to local development.'],
      ['AI Processing', 'Voice transcripts and business questions may be processed by an AI parser to extract transaction fields and generate business insights. Do not speak or enter secrets such as passwords, OTPs, bank PINs, or private keys.'],
      ['User Account Data', 'We collect account identifiers such as name, email, business name, login provider, and role so protected business data can be linked to the correct user.'],
      ['Data Deletion', 'Users can request deletion from the Data Deletion Request page or by emailing support. After identity verification, account-linked production data should be removed from Supabase and backups according to the deletion workflow configured by the business owner.'],
      ['Security', 'Cloud data is designed to be stored in user-specific rows with Supabase Row Level Security policies that allow access only to the authenticated owner.'],
    ],
  },
  'terms-conditions': {
    eyebrow: 'Terms',
    title: 'Terms & Conditions',
    updated: 'Last updated: June 1, 2026',
    sections: [
      ['Business Use', 'Trinetr Business Suite is a business productivity and bookkeeping tool. Users are responsible for verifying entries, invoices, tax reports, and financial decisions before use.'],
      ['No Professional Advice', 'AI insights, GST summaries, profit calculations, and recommendations are informational and are not legal, tax, audit, or accounting advice.'],
      ['User Responsibility', 'You must keep login credentials secure, review generated transactions before saving, and ensure business data is accurate.'],
      ['Acceptable Use', 'Do not use the app to store illegal content, attack systems, bypass security rules, or process data without permission.'],
      ['Availability', 'Offline mode and local backups are provided for development convenience, but production businesses should use Supabase-backed data and export their data regularly.'],
    ],
  },
  'contact-us': {
    eyebrow: 'Support',
    title: 'Contact Us',
    updated: 'We usually respond to business support requests as soon as possible.',
    sections: [
      ['Email', 'trinetr1901@gmail.com'],
      ['Phone / WhatsApp', '+918488943771'],
      ['Support Scope', 'Contact support for account help, data deletion requests, Play Store privacy questions, billing questions, or app feedback.'],
    ],
  },
  'data-deletion': {
    eyebrow: 'Data Rights',
    title: 'Data Deletion Request',
    updated: 'Use this page to request account and business data deletion.',
    sections: [
      ['How To Request', 'Email trinetr1901@gmail.com from your registered email address with the subject "Data Deletion Request". Include your business name and registered mobile number.'],
      ['What Gets Deleted', 'Production deletion should remove user profile data, business records, invoices, ledgers, inventory, CRM records, analytics snapshots, and cloud backups linked to your account.'],
      ['Verification', 'Support may verify ownership before deletion to prevent unauthorized removal of business records.'],
      ['Local Data', 'Demo/local browser data can be removed from App Settings using Reset All Data or by clearing site storage in the browser.'],
    ],
  },
  'about-app': {
    eyebrow: 'About',
    title: 'About Trinetr Business Suite',
    updated: 'Manage Your Business with Voice Commands',
    sections: [
      ['Purpose', 'Trinetr Business Suite helps Indian small businesses record transactions, track inventory, manage customers, create invoices, review reports, and understand business health through a simple voice-first workflow.'],
      ['Platform', 'The app is designed as a mobile-first PWA with Supabase-ready authentication, RLS-protected database storage, PDF exports, and Play Store readiness foundations.'],
      ['Company Contact', 'Support: trinetr1901@gmail.com / +918488943771'],
    ],
  },
};

export function LegalPage({ page = 'privacy-policy', onBack }) {
  const content = LEGAL_COPY[page] || LEGAL_COPY['privacy-policy'];

  return (
    <section className="legal-page fade-in" id={page}>
      <div className="legal-card">
        <button className="secondary-button compact-button" type="button" onClick={onBack}>
          Back
        </button>
        <span className="saas-kicker">{content.eyebrow}</span>
        <h1>{content.title}</h1>
        <p className="legal-updated">{content.updated}</p>
        <div className="legal-section-list">
          {content.sections.map(([title, body]) => (
            <article key={title}>
              <h2>{title}</h2>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export const LEGAL_PAGE_IDS = Object.keys(LEGAL_COPY);

const LEGAL_COPY = {
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
      ['Business Use', 'Voice Business Tracker is a business productivity and bookkeeping tool. Users are responsible for verifying entries, invoices, tax reports, and financial decisions before use.'],
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
    title: 'About Voice Business Tracker',
    updated: 'Manage Your Business with Voice Commands',
    sections: [
      ['Purpose', 'Voice Business Tracker helps Indian small businesses record transactions, track inventory, manage customers, create invoices, review reports, and understand business health through a simple voice-first workflow.'],
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

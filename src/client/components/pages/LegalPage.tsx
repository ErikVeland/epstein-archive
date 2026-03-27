import React from 'react';

interface LegalPageProps {
  mode: 'privacy' | 'terms';
}

const PRIVACY_SECTIONS = [
  {
    heading: 'What We Collect',
    body: 'We collect the information required to operate the archive, including session state, investigation workspace activity, and basic request metadata used for security, stability, and abuse prevention.',
  },
  {
    heading: 'How We Use It',
    body: 'We use this information to authenticate users, protect the platform, improve product quality, and preserve your working context while you investigate inside the archive.',
  },
  {
    heading: 'Sensitive Material',
    body: 'This archive contains sensitive public-interest material. We provide controls for reduced exposure by default, but users remain responsible for handling exported or shared content appropriately.',
  },
];

const TERMS_SECTIONS = [
  {
    heading: 'Research Use',
    body: 'The archive is provided for research, analysis, and public-interest investigation. It is not legal advice, and the platform does not guarantee that every record is complete, current, or error-free.',
  },
  {
    heading: 'User Responsibility',
    body: 'Users are responsible for interpreting evidence carefully, avoiding defamatory claims, and following applicable laws when exporting, publishing, or redistributing material from the archive.',
  },
  {
    heading: 'Availability',
    body: 'We may update, remove, or restrict features in order to protect data integrity, platform stability, legal obligations, or the privacy and safety of affected individuals.',
  },
];

export const LegalPage: React.FC<LegalPageProps> = ({ mode }) => {
  const title = mode === 'privacy' ? 'Privacy Policy' : 'Terms of Service';
  const intro =
    mode === 'privacy'
      ? 'This page explains how the archive handles account, session, and operational data.'
      : 'These terms describe the expectations and limits for using the archive.';
  const sections = mode === 'privacy' ? PRIVACY_SECTIONS : TERMS_SECTIONS;

  return (
    <div className="surface-glass-card max-w-4xl p-[var(--space-6)] md:p-[var(--space-8)]">
      <div className="mb-[var(--space-8)] space-y-[var(--space-3)]">
        <h1 className="text-3xl font-semibold text-[var(--text-primary)]">{title}</h1>
        <p className="text-[var(--text-secondary)] max-w-2xl">{intro}</p>
      </div>

      <div className="space-y-[var(--space-6)]">
        {sections.map((section) => (
          <section key={section.heading} className="space-y-[var(--space-2)]">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{section.heading}</h2>
            <p className="text-[var(--text-secondary)] leading-7">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
};

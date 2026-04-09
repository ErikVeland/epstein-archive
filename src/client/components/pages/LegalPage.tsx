import React from 'react';
import s from './LegalPage.module.css';

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
  {
    heading: 'Document Provenance & Custody Chain',
    body: 'Every record in the archive is subject to a rigorous provenance protocol. This includes SHA-256 cryptographic hashing to ensure source integrity, automated tracking from government release directories, and granular mapping back to original page and sentence coordinates. This verifiable chain of custody ensures that all research and analysis is based on authenticated source material.',
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
    <div className={`surface-panel ${s.root}`}>
      <div className={s.titleBlock}>
        <h1 className={s.title}>{title}</h1>
        <p className={s.intro}>{intro}</p>
      </div>

      <div className={s.sections}>
        {sections.map((section) => (
          <section key={section.heading} className={s.section}>
            <h2 className={s.sectionHeading}>{section.heading}</h2>
            <p className={s.sectionBody}>{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
};

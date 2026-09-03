import type { ReactNode } from 'react';
import Icon from '@client/components/common/Icon';
import { Link } from 'react-router-dom';
import s from './FAQPage.module.css';

interface FAQItem {
  question: string;
  answer: ReactNode;
  icon: ReactNode;
}

const FAQPage = () => {
  const faqs: FAQItem[] = [
    {
      question: 'What is the Epstein Archive?',
      answer:
        'The Epstein Archive preserves and indexes public court records, government disclosures, correspondence, exhibits, media, and other records connected to the Jeffrey Epstein investigations. It helps researchers move from a search result or connection back to the source document.',
      icon: <Icon name="Database" size="md" className={s.iconAccent} />,
    },
    {
      question: "What are the 'DOJ Datasets'?",
      answer:
        'They are large source collections published through the Justice Department’s Epstein Library. The archive keeps collection boundaries and source paths so a result can be traced to the official release. Download and ingestion counts are shown live on the About page.',
      icon: <Icon name="FileText" size="md" className={s.iconInfo} />,
    },
    {
      question: 'Why do the totals change?',
      answer:
        'Source agencies add, remove, replace, or split files. The archive also discovers duplicates and child records during extraction. The About page reports the live database instead of freezing release-day estimates.',
      icon: <Icon name="Clock" size="md" className={s.iconWarning} />,
    },
    {
      question: 'What does a connection mean?',
      answer:
        'A connection is a research lead based on source-linked signals such as shared documents, mentions, dates, or places. It does not prove that two people met, knew each other, agreed on anything, or committed a crime.',
      icon: <Icon name="Network" size="md" className={s.iconAccent} />,
    },
    {
      question: 'What does it mean when a person appears in the archive?',
      answer:
        'Only that the source or an extraction contains the name. A person may be a victim, survivor, witness, employee, investigator, lawyer, journalist, service provider, social contact, or subject of an allegation. Identity can also be uncertain because OCR creates spelling variants.',
      icon: <Icon name="Eye" size="md" className={s.iconAccent} />,
    },
    {
      question: 'Who does the archive call a perpetrator?',
      answer:
        'The archive should use that label only when a reliable legal source establishes the status, such as a conviction or admitted conduct. It does not label an uncharged person a perpetrator because a name appears often or receives an algorithmic score.',
      icon: <Icon name="Scale" size="md" className={s.iconDanger} />,
    },
    {
      question: 'Can AI identify guilt or prove an allegation?',
      answer:
        'No. AI can transcribe, summarise, classify, cluster, and suggest records for review. Its output can be wrong. The archive stores AI work as a separate, versioned artifact with provenance and review status. Legal conclusions require admissible evidence and due process.',
      icon: <Icon name="Shield" size="md" className={s.iconWarning} />,
    },
    {
      question: 'How does AI OCR cleanup work?',
      answer:
        'EXO text models correct visible OCR errors in small chunks. Deterministic checks reject changed numbers, evidence identifiers, major deletions, expansion, and invented wording. Rejected chunks keep the exact source text. Cleaned text remains pending review and never overwrites canonical OCR automatically.',
      icon: <Icon name="FileText" size="md" className={s.iconSuccess} />,
    },
    {
      question: 'Why are scanned pages hidden from the default media browser?',
      answer:
        'The media browser is for photographs and useful visual exhibits. Most extracted PDF images are text pages, blank pages, logos, or low-information graphics. Those records remain available in archival views, but they do not crowd the default photograph view or consume VLM processing.',
      icon: <Icon name="Image" size="md" className={s.iconInfo} />,
    },
    {
      question: 'Could the released records support new criminal cases?',
      answer: (
        <span>
          Potentially. Depending on admissible evidence and jurisdiction, records may be relevant to
          sex trafficking, conspiracy, obstruction, evidence tampering, perjury, false statements,
          or financial facilitation. See{' '}
          <a
            href="https://uscode.house.gov/view.xhtml?edition=prelim&num=0&req=granuleid%3AUSC-prelim-title18-section1591"
            target="_blank"
            rel="noopener noreferrer"
            className={s.inlineLink}
          >
            18 U.S.C. § 1591
          </a>{' '}
          and{' '}
          <a
            href="https://uscode.house.gov/view.xhtml?edition=prelim&num=0&req=granuleid%3AUSC-prelim-title18-section1594"
            target="_blank"
            rel="noopener noreferrer"
            className={s.inlineLink}
          >
            § 1594
          </a>
          . The archive cannot decide whether charges are justified.
        </span>
      ),
      icon: <Icon name="Scale" size="md" className={s.iconDanger} />,
    },
    {
      question: 'Is it too late to prosecute?',
      answer: (
        <span>
          Not necessarily. Federal law permits an indictment for a section 1591 offence at any time
          without limitation under{' '}
          <a
            href="https://uscode.house.gov/view.xhtml?edition=prelim&req=granuleid%3AUSC-prelim-title18-section3299"
            target="_blank"
            rel="noopener noreferrer"
            className={s.inlineLink}
          >
            18 U.S.C. § 3299
          </a>
          . Other offences can have different limits, effective dates, and jurisdictional rules.
          Prosecutors must assess each potential charge and each person separately.
        </span>
      ),
      icon: <Icon name="Clock" size="md" className={s.iconWarning} />,
    },
    {
      question: 'Why have so few people faced criminal charges?',
      answer: (
        <span>
          The public record does not support one complete answer. Barriers can include fragmented
          evidence, delayed investigations, witness trauma and safety, secrecy, redactions,
          jurisdiction, proof of intent, and prior agreements. The Justice Department's own{' '}
          <a
            href="https://www.justice.gov/archives/opa/pr/statement-doj-office-professional-responsibility-report-jeffrey-epstein-2006-2008"
            target="_blank"
            rel="noopener noreferrer"
            className={s.inlineLink}
          >
            professional-responsibility review
          </a>{' '}
          found poor judgment in the 2006–2008 federal resolution and found that victims were not
          treated with the expected forthrightness and sensitivity.
        </span>
      ),
      icon: <Icon name="AlertTriangle" size="md" className={s.iconDanger} />,
    },
    {
      question: 'Why are some documents redacted?',
      answer:
        'Official redactions can protect victims, private individuals, grand-jury material, investigative methods, or active matters. The archive never changes the original file. The Redaction Intelligence view can identify text that remains machine-readable beneath a later PDF overlay. It can also rank context-supported candidates for names or identifiers, but those candidates are hypotheses. Confidence measures contextual fit, not truth, identity, or guilt.',
      icon: <Icon name="Lock" size="md" className={s.iconDanger} />,
    },
    {
      question: 'How does the archive protect victims and survivors?',
      answer:
        'The archive preserves official redactions, limits sensitive media, keeps machine interpretations separate, and avoids treating names as guilt. Researchers must not identify, contact, or harass victims and survivors. Public accountability must not create new harm.',
      icon: <Icon name="Shield" size="md" className={s.iconSuccess} />,
    },
    {
      question: 'How can I verify a result?',
      answer:
        'Open the source document and check its collection, file path, page or position, provenance status, and available hash. Treat summaries, entity matches, relationship signals, and visual descriptions as navigation aids until a human verifies them against the source.',
      icon: <Icon name="CheckCircle2" size="md" className={s.iconSuccess} />,
    },
    {
      question: 'Can I download the documents?',
      answer:
        'Public records can be viewed and, where a source file is available, downloaded from the document viewer. The archive preserves source paths and cryptographic hashes where available so researchers can check file integrity.',
      icon: <Icon name="Download" size="md" className={s.iconSuccess} />,
    },
    {
      question: 'How do I start an investigation?',
      answer: (
        <span>
          Starting is easy. Create a new case file, then browse entities and documents. When you
          find something relevant, click "Add to Investigation". For a detailed walkthrough, see our{' '}
          <Link to="/guide" className={s.inlineLink}>
            Investigation System Guide
          </Link>
          .
        </span>
      ),
      icon: <Icon name="FileText" size="md" className={s.iconAccent} />,
    },
    {
      question: 'How can I report a bad match, unsafe content, or missing context?',
      answer:
        'Record the document identifier, source collection, page, and the problem. Keep the source and machine-generated output separate. Corrections should improve indexing or context without deleting the original record or silently changing evidence.',
      icon: <Icon name="HelpCircle" size="md" className={s.iconInfo} />,
    },
  ];

  return (
    <div className={s.pageRoot}>
      <div className={s.container}>
        {/* Header */}
        <header className={s.header}>
          <Link to="/about" className={s.backLink}>
            <Icon name="ArrowLeft" size="sm" className={s.backIcon} />
            Back to About
          </Link>

          <div className={s.hero}>
            <div className={s.eyebrow}>
              <Icon name="HelpCircle" size="sm" />
              Frequently Asked Questions
            </div>
            <h1 className={s.title}>Understanding the Archive</h1>
            <p className={s.lede}>
              Common questions about the data sources, forensic methods, and how to interpret the
              evidence.
            </p>
          </div>
        </header>

        {/* FAQs */}
        <div className={s.faqGrid}>
          {faqs.map((faq, idx) => (
            <div key={idx} className={s.faqCard}>
              <div className={s.faqRow}>
                <div className={s.iconShell}>{faq.icon}</div>
                <div className={s.faqBody}>
                  <h3 className={s.question}>{faq.question}</h3>
                  <div className={s.answer}>{faq.answer}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={s.footer}>
          <p className={s.footerText}>
            Still have questions? The archive is continuously updated as new evidence is processed.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;

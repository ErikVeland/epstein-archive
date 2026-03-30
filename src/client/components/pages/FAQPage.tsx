import type { ReactNode, SVGProps } from 'react';
import { ArrowLeft, HelpCircle, Shield, FileText, Lock, Eye, Database } from 'lucide-react';
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
        'The Epstein Archive is a centralized, searchable database of documents related to the Jeffrey Epstein investigation. It consolidates evidence from multiple sources, including unsealed court documents (Giuffre v. Maxwell), police reports, flight logs, and the newly integrated DOJ discovery datasets.',
      icon: <Database size={20} className={s.iconAccent} />,
    },
    {
      question: "What are the 'DOJ Datasets'?",
      answer:
        'These are large volumes of evidence released by the Department of Justice, which we have processed and ingested. They include Dataset 9 (prosecutorial files), Dataset 10 (financial records), Dataset 11 (multimedia), and Dataset 12 (investigative referrals). These files provide significantly more detail on financial networks and operational logistics than previous releases.',
      icon: <FileText size={20} className={s.iconInfo} />,
    },
    {
      question: 'Why are some documents redacted?',
      answer:
        'Redactions protect the privacy of victims, innocent third parties, and ongoing investigations. Our system analyzes redaction levels (e.g., Dataset 11 is 52% redacted due to sensitive multimedia content) to give context on what remains withheld versus what is visible.',
      icon: <Lock size={20} className={s.iconDanger} />,
    },
    {
      question: "What is the 'Red Flag' rating?",
      answer:
        'This is a forensic scoring system derived from legal thresholds. Mere presence in a flight log (Association) gets a low score, while sworn testimony alleging participation (Complicity) receives a higher score. It helps investigators prioritize which documents to review first.',
      icon: <Shield size={20} className={s.iconWarning} />,
    },
    {
      question: "Why are there so many recent documents (past Epstein's death)?",
      answer:
        'The investigation into the network remained active long after 2019. These documents primarily pertain to the prosecution of Ghislaine Maxwell, ongoing civil litigation by survivors, and internal corporate investigations (e.g., Barclays, JPMorgan). They provide crucial context on how the network operated and the legal efforts to identify co-conspirators.',
      icon: <Eye size={20} className={s.iconAccent} />,
    },
    {
      question: 'Can I download the documents?',
      answer:
        'Yes. Publicly available documents can be viewed and often downloaded directly from the viewer. We maintain the original file integrity, including verifying cryptographic hashes to ensure evidence has not been tampered with.',
      icon: <DownloadIcon className={s.iconSuccess} />,
    },
    {
      question: 'How do I start an investigation?',
      answer: (
        <span>
          Starting is easy. Create a new case file, then browse entities and documents. When you
          find something relevant, click "Add to Investigation". For a detailed walkthrough, see our{' '}
          <a
            href="https://github.com/ErikVeland/epstein-archive/blob/main/INVESTIGATION_GUIDE.md"
            target="_blank"
            rel="noopener noreferrer"
            className={s.inlineLink}
          >
            Investigation System Guide
          </a>
          .
        </span>
      ),
      icon: <FileText size={20} className={s.iconAccent} />,
    },
  ];

  return (
    <div className={s.pageRoot}>
      <div className={s.container}>
        {/* Header */}
        <header className={s.header}>
          <Link to="/about" className={s.backLink}>
            <ArrowLeft size={16} className={s.backIcon} />
            Back to About
          </Link>

          <div className={s.hero}>
            <div className={s.eyebrow}>
              <HelpCircle size={16} />
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

// Local component since we didn't import Download from lucide-react in the top import for the implementation plan string
const DownloadIcon = ({ className }: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export default FAQPage;

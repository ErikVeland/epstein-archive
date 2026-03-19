import { ArrowLeft, HelpCircle, Shield, FileText, Lock, Eye, Database } from 'lucide-react';
import { Link } from 'react-router-dom';

const FAQPage = () => {
  const faqs = [
    {
      question: 'What is the Epstein Archive?',
      answer:
        'The Epstein Archive is a centralized, searchable database of documents related to the Jeffrey Epstein investigation. It consolidates evidence from multiple sources, including unsealed court documents (Giuffre v. Maxwell), police reports, flight logs, and the newly integrated DOJ discovery datasets.',
      icon: <Database className="w-5 h-5 text-[var(--accent)]" />,
    },
    {
      question: "What are the 'DOJ Datasets'?",
      answer:
        'These are large volumes of evidence released by the Department of Justice, which we have processed and ingested. They include Dataset 9 (prosecutorial files), Dataset 10 (financial records), Dataset 11 (multimedia), and Dataset 12 (investigative referrals). These files provide significantly more detail on financial networks and operational logistics than previous releases.',
      icon: <FileText className="w-5 h-5 text-[var(--accent-info)]" />,
    },
    {
      question: 'Why are some documents redacted?',
      answer:
        'Redactions protect the privacy of victims, innocent third parties, and ongoing investigations. Our system analyzes redaction levels (e.g., Dataset 11 is 52% redacted due to sensitive multimedia content) to give context on what is hidden versus what is visible.',
      icon: <Lock className="w-5 h-5 text-[var(--accent-danger)]" />,
    },
    {
      question: "What is the 'Red Flag' rating?",
      answer:
        'This is a forensic scoring system derived from legal thresholds. Mere presence in a flight log (Association) gets a low score, while sworn testimony alleging participation (Complicity) receives a higher score. It helps investigators prioritize which documents to review first.',
      icon: <Shield className="w-5 h-5 text-[var(--accent-warning)]" />,
    },
    {
      question: "Why are there so many recent documents (past Epstein's death)?",
      answer:
        'The investigation into the network remained active long after 2019. These documents primarily pertain to the prosecution of Ghislaine Maxwell, ongoing civil litigation by survivors, and internal corporate investigations (e.g., Barclays, JPMorgan). They provide crucial context on how the network operated and the legal efforts to identify co-conspirators.',
      icon: <Eye className="w-5 h-5 text-[var(--accent)]" />,
    },
    {
      question: 'Can I download the documents?',
      answer:
        'Yes. Publicly available documents can be viewed and often downloaded directly from the viewer. We maintain the original file integrity, including verifying cryptographic hashes to ensure evidence has not been tampered with.',
      icon: <DownloadIcon className="w-5 h-5 text-[var(--accent-success)]" />,
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
            className="text-[var(--accent)] hover:text-[var(--accent-info)] underline"
          >
            Investigation System Guide
          </a>
          .
        </span>
      ),
      icon: <FileText className="w-5 h-5 text-[var(--accent)]" />,
    },
  ];

  return (
    <div className="min-h-screen text-[var(--text-primary)] p-6 md:p-12 font-sans selection:bg-[var(--accent)]/30">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <header className="space-y-6">
          <Link
            to="/about"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to About
          </Link>

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] text-xs font-medium uppercase tracking-wider">
              <HelpCircle className="h-4 w-4" />
              Frequently Asked Questions
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] tracking-tight">
              Understanding the Archive
            </h1>
            <p className="text-xl text-[var(--text-muted)] max-w-2xl leading-relaxed">
              Common questions about the data sources, forensic methods, and how to interpret the
              evidence.
            </p>
          </div>
        </header>

        {/* FAQs */}
        <div className="grid gap-6">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-[var(--glass-bg)]/30 border border-[var(--glass-border)] rounded-[var(--radius-xl)] p-6 md:p-8 hover:bg-[var(--glass-bg)]/50 transition-colors"
            >
              <div className="flex gap-4">
                <div className="flex-none p-2 bg-[var(--glass-bg-strong)]/50 rounded-[var(--radius-lg)] h-fit border border-[var(--glass-border)]">
                  {faq.icon}
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                    {faq.question}
                  </h3>
                  <p className="text-[var(--text-muted)] leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-12 border-t border-[var(--glass-border)] text-center">
          <p className="text-[var(--text-muted)] text-sm">
            Still have questions? The archive is continuously updated as new evidence is processed.
          </p>
        </div>
      </div>
    </div>
  );
};

// Local component since we didn't import Download from lucide-react in the top import for the implementation plan string
const DownloadIcon = ({ className }: { className?: string }) => (
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

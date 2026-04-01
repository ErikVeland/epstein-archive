import {
  ArrowLeft,
  BookOpen,
  Zap,
  Layout,
  Database,
  Share2,
  PlusCircle,
  Target,
  Network,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import s from './GuidePage.module.css';

const GuidePage = () => {
  return (
    <div className={s.pageRoot}>
      <div className={s.container}>
        {/* Header */}
        <header className={s.header}>
          <Link to="/investigations" className={s.backLink}>
            <ArrowLeft size={16} />
            Back to Investigations
          </Link>

          <div className={s.hero}>
            <div className={s.eyebrow}>
              <BookOpen size={14} />
              System Manual
            </div>
            <h1 className={s.title}>Investigation Guide</h1>
            <p className={s.lede}>
              Master the Epstein Archive's collaborative workspace. Move from passive viewing to
              active analysis by organizing evidence into coherent, forensic cases.
            </p>
          </div>
        </header>

        <main className={s.content}>
          {/* Overview Section */}
          <section className={s.section}>
            <h2 className={s.sectionTitle}>
              <Layers size={20} className={s.accentIcon} />
              Platform Overview
            </h2>
            <div className={s.prose}>
              <p>
                The <strong>Investigation System</strong> is the core workspace for researchers. It
                centralizes entities, documents, and multimedia into a single context, allowing for
                deep correlation and hypothesis testing.
              </p>
            </div>
          </section>

          {/* Quick Start Section */}
          <section className={s.section}>
            <h2 className={s.sectionTitle}>
              <Zap size={20} className={s.accentIcon} />
              Quick Start Workflow
            </h2>
            <div className={s.cardGrid}>
              <div className={s.stepCard}>
                <span className={s.stepNumber}>STEP 01</span>
                <PlusCircle size={24} color="var(--accent)" />
                <h3 className={s.stepTitle}>Initiate</h3>
                <p className={s.stepDesc}>
                  Create a "New Investigation" and define your initial research hypothesis.
                </p>
              </div>
              <div className={s.stepCard}>
                <span className={s.stepNumber}>STEP 02</span>
                <Database size={24} color="var(--accent)" />
                <h3 className={s.stepTitle}>Collect</h3>
                <p className={s.stepDesc}>
                  Browse the archive. Use "Add to Investigation" on any Person, Document, or Flight.
                </p>
              </div>
              <div className={s.stepCard}>
                <span className={s.stepNumber}>STEP 03</span>
                <Target size={24} color="var(--accent)" />
                <h3 className={s.stepTitle}>Analyze</h3>
                <p className={s.stepDesc}>
                  Organize items on the visual Board, build Timelines, and record your findings.
                </p>
              </div>
            </div>
          </section>

          {/* Key Components Section */}
          <section className={s.section}>
            <h2 className={s.sectionTitle}>
              <Layout size={20} className={s.accentIcon} />
              Primary Workspaces
            </h2>
            <div className={s.prose}>
              <ul>
                <li>
                  <strong>The Infinite Board:</strong> A 2D spatial canvas for mapping connections
                  between nodes. Drag items from your Case Folder to visualize the network.
                </li>
                <li>
                  <strong>Case Folder:</strong> Your central repository. Automatically organizes
                  pinned evidence by type (Entities, Documents, Media).
                </li>
                <li>
                  <strong>Timeline Builder:</strong> A chronological view of events derived from
                  multiple sources, allowing you to see the "Sequence of Events" clearly.
                </li>
                <li>
                  <strong>Forensic Tools:</strong> Specialized viewers for OCR verification,
                  multimedia analysis, and document annotation.
                </li>
              </ul>
            </div>
          </section>

          {/* Architecture/Visual Section */}
          <section className={s.section}>
            <h2 className={s.sectionTitle}>
              <Network size={20} className={s.accentIcon} />
              System Architecture
            </h2>
            <div className={s.diagramPlaceholder}>
              <div className={s.diagramGlow} />
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2rem',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    padding: '1rem 2rem',
                    border: '1px solid var(--accent)',
                    borderRadius: '12px',
                    background: 'var(--glass-bg-strong)',
                    fontWeight: 600,
                  }}
                >
                  Researcher Interface
                </div>
                <div style={{ color: 'var(--text-muted)' }}>
                  <Layers size={24} />
                </div>
                <div style={{ display: 'flex', gap: '2rem' }}>
                  <div
                    style={{
                      padding: '0.75rem 1.5rem',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      background: 'var(--glass-bg)',
                      fontSize: '0.875rem',
                    }}
                  >
                    Board
                  </div>
                  <div
                    style={{
                      padding: '0.75rem 1.5rem',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      background: 'var(--glass-bg)',
                      fontSize: '0.875rem',
                    }}
                  >
                    Evidence
                  </div>
                  <div
                    style={{
                      padding: '0.75rem 1.5rem',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      background: 'var(--glass-bg)',
                      fontSize: '0.875rem',
                    }}
                  >
                    Timeline
                  </div>
                </div>
                <div style={{ color: 'var(--text-muted)' }}>
                  <ChevronRight size={24} style={{ transform: 'rotate(90deg)' }} />
                </div>
                <div
                  style={{
                    padding: '1rem 2rem',
                    border: '1px solid var(--accent-info)',
                    borderRadius: '12px',
                    background:
                      'color-mix(in srgb, var(--accent-info) 10%, var(--glass-bg-strong))',
                    fontWeight: 600,
                  }}
                >
                  Data Integrity & Sync Layer
                </div>
              </div>
            </div>
          </section>

          {/* Sync Section */}
          <section className={s.section}>
            <h2 className={s.sectionTitle}>
              <Share2 size={20} className={s.accentIcon} />
              Data Persistence
            </h2>
            <div className={s.prose}>
              <p>
                All actions are persisted to the centralized database in real-time. Changes to the
                Board or Timeline are immediately visible to other investigators authorized on the
                same case.
              </p>
            </div>
            <div className={s.technicalNote}>
              <Info size={16} />
              <span>
                Technical Note: The system uses a specialized Context Provider to manage
                cross-component state synchronization.
              </span>
            </div>
          </section>
        </main>

        <footer className={s.footer}>
          <p className={s.footerText}>
            Epstein Archive Investigation System v2.4.0 • Confidential Investigative Resource
          </p>
        </footer>
      </div>
    </div>
  );
};

export default GuidePage;

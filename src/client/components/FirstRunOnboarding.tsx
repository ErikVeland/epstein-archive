import React, { useState } from 'react';
import Icon, { type IconName } from '@client/components/common/Icon';
import { CloseButton } from './common/CloseButton';
import { useScrollLock } from '@client/hooks/useScrollLock';
import styles from './FirstRunOnboarding.module.css';

import { Button } from '@client/design-system/lib';

interface FirstRunOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

type RoleType = 'investigator' | 'academic' | 'journalist' | 'sleuth';

const roleOptions: Array<{
  id: RoleType;
  name: string;
  desc: string;
  icon: IconName;
}> = [
  {
    id: 'investigator',
    name: 'Forensic Investigator',
    desc: 'Isolate financial flows, build court-ready portfolios, and run hypothesis tests.',
    icon: 'SearchCheck',
  },
  {
    id: 'academic',
    name: 'Academic Researcher',
    desc: 'Analyze macro influence structures, centrality bridge nodes, and multi-hop paths.',
    icon: 'BookOpen',
  },
  {
    id: 'journalist',
    name: 'Investigative Journalist',
    desc: 'Monitor anomaly lead feeds, read page-by-page AI briefs, and verify source hashes.',
    icon: 'Newspaper',
  },
  {
    id: 'sleuth',
    name: 'Internet Sleuth',
    desc: 'Fact-check primary DOJ records, browse contact books, and filter red-flags.',
    icon: 'Globe',
  },
];

export const FirstRunOnboarding: React.FC<FirstRunOnboardingProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<RoleType>('investigator');
  const totalSteps = 4;
  useScrollLock(true);

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  const getStepContent = () => {
    if (step === 1) {
      return {
        title: 'Tailor Your Experience',
        description:
          "Select your focus profile to calibrate the Epstein Archive's forensic visualization tools, search rails, and automated feeds specifically to your workflow.",
        icon: null,
      };
    }

    switch (selectedRole) {
      case 'investigator':
        switch (step) {
          case 2:
            return {
              title: 'Forensic Pattern Detection',
              description:
                'The Financial Transaction Mapper automatically isolates suspicious offshore transfers, round-tripping cycles, and money layering with cumulative Entity Risk Scores.',
              icon: <Icon name="TrendingUp" className={styles.stepIconBase} />,
            };
          case 3:
            return {
              title: 'Hypothesis Testing Framework',
              description:
                'Formulate investigative theories and systematically weigh Supporting vs. Contradicting evidence indices linked to immutable sha256 hashes.',
              icon: <Icon name="ShieldAlert" className={styles.stepIconBase} />,
            };
          case 4:
            return {
              title: 'Case Folder Portfolios',
              description:
                'Organize transactional ledgers, passenger flights, and communication networks into active case portfolios with strict chain-of-custody tracking.',
              icon: <Icon name="Folder" className={styles.stepIconBase} />,
            };
          default:
            return { title: '', description: '', icon: null };
        }
      case 'academic':
        switch (step) {
          case 2:
            return {
              title: 'Influence Centrality Graphs',
              description:
                'Filter the interactive network graph to isolate dense societal clusters and identify central "bridge nodes" linking disparate power groups.',
              icon: <Icon name="Layers" className={styles.stepIconBase} />,
            };
          case 3:
            return {
              title: 'Macro-Timeline Analytics',
              description:
                'Track decades of peak prominence, document mentions, and flight coordinates for suspect groups using multi-dimensional timeline maps.',
              icon: <Icon name="Calendar" className={styles.stepIconBase} />,
            };
          case 4:
            return {
              title: 'Multi-Hop Pathfinding',
              description:
                'Dynamically expand relationship networks across multiple degrees of separation by querying connected semantic triples interactively.',
              icon: <Icon name="Share2" className={styles.stepIconBase} />,
            };
          default:
            return { title: '', description: '', icon: null };
        }
      case 'journalist':
        switch (step) {
          case 2:
            return {
              title: 'Automated Anomalies Feed',
              description:
                'Monitor your active home feed for automated intelligence triggers linking bank statements closely with flight manifests.',
              icon: <Icon name="Activity" className={styles.stepIconBase} />,
            };
          case 3:
            return {
              title: 'Page-by-Page AI Briefs',
              description:
                'Skip reading 500-page depositions. The metadata rail lists concise page-range sub-summaries so you skip straight to critical testimonies.',
              icon: <Icon name="FileText" className={styles.stepIconBase} />,
            };
          case 4:
            return {
              title: 'Evidence Provenance Panels',
              description:
                'Instantly verify the source collection, physical box number, and forensic context of any document or cropped asset to ensure reporting accuracy.',
              icon: <Icon name="Search" className={styles.stepIconBase} />,
            };
          default:
            return { title: '', description: '', icon: null };
        }
      case 'sleuth':
      default:
        switch (step) {
          case 2:
            return {
              title: 'Interactive Black Book Viewer',
              description:
                'Examine digitized, alphabetized address logs, with each entry cross-linked to public flight logs and court appearances.',
              icon: <Icon name="Book" className={styles.stepIconBase} />,
            };
          case 3:
            return {
              title: 'Red Flag Threat Indices',
              description:
                'Instantly spot high-risk suspect accounts and legal files using simple color-coded ratings scaling from low to critical danger.',
              icon: <Icon name="AlertTriangle" className={styles.stepIconBase} />,
            };
          case 4:
            return {
              title: 'Primary Record Box Browsing',
              description:
                'Explore raw archive files, photos, and source materials box-by-box, exactly as obtained from original legal archives.',
              icon: <Icon name="FolderOpen" className={styles.stepIconBase} />,
            };
          default:
            return { title: '', description: '', icon: null };
        }
    }
  };

  const { title, description, icon } = getStepContent();

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>
            <span className={styles.titleAccent} />
            Getting Started
          </h2>
          <CloseButton
            onClick={handleSkip}
            size="md"
            label="Close onboarding"
            className={styles.closeButton}
          />
        </div>

        {/* Progress */}
        <div className={styles.progressSection}>
          <div className={styles.progressHeader}>
            <span>
              Step {step} of {totalSteps}
            </span>
            <span className={styles.progressValue}>
              {Math.round((step / totalSteps) * 100)}% complete
            </span>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {step === 1 ? (
            <div className={styles.rolesGrid}>
              {roleOptions.map((role) => (
                <div
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={`${styles.roleCard} ${selectedRole === role.id ? styles.roleCardActive : ''}`}
                >
                  <span className={styles.roleIconShell}>
                    <Icon name={role.icon} className={styles.roleIcon} />
                  </span>
                  <div className={styles.roleText}>
                    <span className={styles.roleName}>{role.name}</span>
                    <p className={styles.roleDesc}>{role.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className={styles.iconShell}>
                <div className={styles.iconGlow} />
                <div className={styles.iconFrame}>
                  {icon &&
                    React.cloneElement(icon as React.ReactElement, {
                      className: styles.contentIcon,
                    })}
                </div>
              </div>

              <h3 className={styles.contentTitle}>{title}</h3>
              <p className={styles.contentDescription}>{description}</p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <Button unstyled onClick={handleSkip} className={styles.textButton}>
            Skip Tour
          </Button>
          <div className={styles.footerActions}>
            {step > 1 && (
              <Button unstyled onClick={() => setStep(step - 1)} className={styles.textButton}>
                Previous
              </Button>
            )}
            <Button unstyled onClick={handleNext} className={styles.primaryButton}>
              {step === totalSteps ? 'Get Started' : 'Next'}
              {step !== totalSteps && (
                <Icon name="ArrowRight" className={styles.primaryButtonIcon} />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

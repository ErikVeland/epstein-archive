import React, { useState } from 'react';
import Icon from '@client/components/common/Icon';
import { CloseButton } from './common/CloseButton';
import { useScrollLock } from '@client/hooks/useScrollLock';
import styles from './FirstRunOnboarding.module.css';

import { Button } from '@client/design-system/lib';

interface FirstRunOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const FirstRunOnboarding: React.FC<FirstRunOnboardingProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState(1);
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
    switch (step) {
      case 1:
        return {
          title: 'Welcome to the Epstein Archive',
          description:
            'Discover a powerful tool for investigating complex networks and uncovering hidden connections through advanced search and analysis capabilities.',
          icon: <Icon name="Search" className={styles.stepIconBase} />,
        };
      case 2:
        return {
          title: 'Filter by Red Flag Index',
          description:
            'Use the Red Flag Index to cut through noise and focus on the most significant entities and documents in your investigation. Higher ratings indicate stronger evidence connections.',
          icon: <Icon name="Flag" className={styles.stepIconBase} />,
        };
      case 3:
        return {
          title: 'Build Investigations with Evidence',
          description:
            'Add people, documents, and connections to investigations to build comprehensive case files. Everything you add is traceable back to source documents.',
          icon: <Icon name="Plus" className={styles.stepIconBase} />,
        };
      case 4:
        return {
          title: 'Unlock Advanced Features',
          description:
            'Explore powerful features like network visualization, advanced filtering, and collaborative investigations to deepen your research.',
          icon: <Icon name="Filter" className={styles.stepIconBase} />,
        };
      default:
        return {
          title: '',
          description: '',
          icon: null,
        };
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
          <div className={styles.iconShell}>
            <div className={styles.iconGlow} />
            <div className={styles.iconFrame}>
              {React.cloneElement(icon as React.ReactElement, {
                className: styles.contentIcon,
              })}
            </div>
          </div>

          <h3 className={styles.contentTitle}>{title}</h3>
          <p className={styles.contentDescription}>{description}</p>
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

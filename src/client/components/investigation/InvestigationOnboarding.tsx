import React, { useState } from 'react';
import { ArrowRight, Filter, Search, FileText, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseButton } from '../common/CloseButton';
import { useScrollLock } from '../../hooks/useScrollLock';
import { Link } from 'react-router-dom';
import styles from './InvestigationOnboarding.module.css';

interface InvestigationOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const InvestigationOnboarding: React.FC<InvestigationOnboardingProps> = ({
  onComplete,
  onSkip,
}) => {
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  useScrollLock(true);

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const steps = [
    {
      id: 1,
      title: 'Start an Investigation',
      description:
        'Begin by creating a new investigation. Give it a meaningful name and description to help you stay organized.',
      icon: Search,
      tone: 'primary',
    },
    {
      id: 2,
      title: 'Filter by Red Flag Index',
      description:
        'Cut through noise using the Red Flag Index to focus on the most significant entities and documents.',
      icon: Filter,
      tone: 'danger',
    },
    {
      id: 3,
      title: 'Verify Source Documents',
      description:
        'Every insight is linked to its source. Trace connections back to original documents for complete auditability.',
      icon: FileText,
      tone: 'success',
    },
  ];

  const currentStep = steps[step - 1];
  const Icon = currentStep.icon;
  const toneClassName =
    currentStep.tone === 'danger'
      ? styles.toneDanger
      : currentStep.tone === 'success'
        ? styles.toneSuccess
        : styles.tonePrimary;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={styles.overlay}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
        className={styles.modal}
      >
        {/* Decorative Background Gradients */}
        <div className={styles.topGlow} />
        <div className={styles.bottomGlow} />

        {/* Header */}
        <div className={styles.header}>
          {/* Progress Indicators */}
          <div className={styles.progressDots}>
            {steps.map((s) => (
              <div
                key={s.id}
                className={`${styles.progressDot} ${
                  s.id === step
                    ? styles.progressDotActive
                    : s.id < step
                      ? styles.progressDotCompleted
                      : styles.progressDotPending
                }`}
              />
            ))}
          </div>

          <CloseButton
            onClick={onSkip}
            size="md"
            label="Close investigation onboarding"
            className={styles.closeButton}
          />
        </div>

        {/* Content Area */}
        <div className={styles.content}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className={styles.contentInner}
            >
              {/* Icon Container */}
              <div className={`${styles.iconContainer} ${toneClassName}`}>
                <Icon className={styles.icon} />
              </div>

              <h2 className={styles.title}>{currentStep.title}</h2>
              <p className={styles.description}>{currentStep.description}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            className={styles.primaryButton}
          >
            <span>{step === totalSteps ? 'Get Started' : 'Continue'}</span>
            {step === totalSteps ? (
              <CheckCircle className={styles.primaryButtonIconDone} />
            ) : (
              <ArrowRight className={styles.primaryButtonIcon} />
            )}
          </motion.button>

          <Link to="/guide" className={styles.guideLink}>
            Read the Full Guide
          </Link>

          <button onClick={onSkip} className={styles.skipButton}>
            Skip Introduction
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

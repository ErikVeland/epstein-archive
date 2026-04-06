import React, { useState } from 'react';
import { ArrowRight, Target, FileText, BookOpen, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseButton } from '../common/CloseButton';
import { useScrollLock } from '../../hooks/useScrollLock';

import styles from './BoardOnboarding.module.css';

interface BoardOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const BoardOnboarding: React.FC<BoardOnboardingProps> = ({ onComplete, onSkip }) => {
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
      title: 'Define Your Hypotheses',
      description:
        'Start on the left. create theories or questions you want to answer. These act as the "buckets" for your evidence.',
      icon: Target,
      containerClass: styles.iconContainerPurple,
      iconClass: styles.iconPurple,
    },
    {
      id: 2,
      title: 'Gather & Connect Evidence',
      description:
        'Items you "Add to Investigation" from around the app appear in the middle Evidence Pool. Drag them onto Hypotheses to prove or disprove them.',
      icon: FileText,
      containerClass: styles.iconContainerAccent,
      iconClass: styles.iconAccent,
    },
    {
      id: 3,
      title: 'Build Your Case',
      description:
        'Finally, drag your proven points into the Case Narrative on the right. This organizes your findings into a coherent story ready for export.',
      icon: BookOpen,
      containerClass: styles.iconContainerAmber,
      iconClass: styles.iconAmber,
    },
  ];

  const currentStep = steps[step - 1];
  const Icon = currentStep.icon;

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
        className={`relative surface-glass shadow-[var(--glass-shadow)] ${styles.modal}`}
      >
        {/* Progress Bar */}
        <div
          className={`absolute top-0 left-0 right-0 h-1 surface-glass ${styles.progressBarTrack}`}
        >
          <motion.div
            className={styles.progressBarFill}
            initial={{ width: '0%' }}
            animate={{ width: `${(step / totalSteps) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Content Area */}
        <div className={styles.content}>
          <div className={styles.closeButtonWrapper}>
            <CloseButton
              onClick={onSkip}
              size="sm"
              label="Close board onboarding"
              className="bg-transparent hover:bg-[var(--glass-bg)] border-[var(--glass-border)]"
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className={styles.stepContent}
            >
              <div className={`${styles.iconContainer} ${currentStep.containerClass}`}>
                <Icon className={currentStep.iconClass} />
              </div>

              <h2 className={styles.stepTitle}>{currentStep.title}</h2>
              <p className={styles.stepDescription}>{currentStep.description}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button onClick={handleNext} className={styles.nextButton}>
            <span>{step === totalSteps ? 'Start Investigating' : 'Next'}</span>
            {step === totalSteps ? (
              <CheckCircle className={styles.iconSm} />
            ) : (
              <ArrowRight className={styles.iconSm} />
            )}
          </button>

          <div className={styles.stepCounter}>
            <span className={styles.stepCounterText}>
              Step {step} of {totalSteps}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

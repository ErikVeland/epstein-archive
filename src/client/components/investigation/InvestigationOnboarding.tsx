import React, { useState } from 'react';
import Icon from '@client/components/common/Icon';
import type { IconName } from '@client/components/common/Icon';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseButton } from '../common/CloseButton';
import { useScrollLock } from '@client/hooks/useScrollLock';
import { Surface, Button, Flex, Box, Stack, LqText } from '@client/design-system/lib';
import styles from './InvestigationOnboarding.module.css';

interface InvestigationOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

const STEPS = [
  {
    id: 1,
    title: 'Your Investigation Workspace',
    description:
      'An investigation is a focused workspace for a single case or question. Bookmark documents, track entities, and build your narrative all in one place.',
    icon: 'FolderOpen' as IconName,
  },
  {
    id: 2,
    title: 'Find and Add Evidence',
    description:
      'Search the archive and pin relevant documents to your investigation. Flag key passages and link them to the people or organizations involved.',
    icon: 'Search' as IconName,
  },
  {
    id: 3,
    title: 'Map the Connections',
    description:
      'Use the Board to test hypotheses against your evidence. Drag documents onto theories to build a structured chain of proof.',
    icon: 'Layers' as IconName,
  },
  {
    id: 4,
    title: 'Export Your Findings',
    description:
      'When your investigation is complete, export a briefing document with your full evidence chain and source citations intact.',
    icon: 'FileOutput' as IconName,
  },
];

export const InvestigationOnboarding: React.FC<InvestigationOnboardingProps> = ({
  onComplete,
  onSkip,
}) => {
  const [step, setStep] = useState(1);
  const totalSteps = STEPS.length;
  useScrollLock(true);

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const currentStep = STEPS[step - 1];
  const pct = Math.round((step / totalSteps) * 100);

  return (
    <Box className={styles.overlay} onClick={onSkip}>
      <motion.div
        className={styles.panelWrapper}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ type: 'spring', duration: 0.5, bounce: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Surface variant="panel" p="none" className={styles.panel}>
          {/* Header */}
          <Flex justify="between" align="center" className={styles.header}>
            <Flex align="center" gap="md">
              <Box className={styles.accentBar} />
              <LqText variant="h2" weight="bold">
                Getting Started
              </LqText>
            </Flex>
            <CloseButton onClick={onSkip} />
          </Flex>

          {/* Progress */}
          <Box className={styles.progressSection}>
            <Flex justify="between" align="center" className={styles.progressMeta}>
              <LqText variant="xs" weight="bold" color="muted" className={styles.stepLabel}>
                Step {step} of {totalSteps}
              </LqText>
              <LqText variant="xs" weight="bold" className={styles.pctLabel}>
                {pct}% Complete
              </LqText>
            </Flex>
            <Box className={styles.progressTrack}>
              <motion.div
                className={styles.progressFill}
                initial={{ width: '0%' }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.4 }}
              />
            </Box>
          </Box>

          {/* Content */}
          <Box className={styles.content}>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className={styles.stepContent}
              >
                <Box className={styles.iconWrapper}>
                  <Box className={styles.iconGlow} />
                  <Icon name={currentStep.icon} size="xl" className={styles.stepIcon} />
                </Box>
                <Stack gap="md" className={styles.textBlock}>
                  <LqText variant="h2" weight="bold">
                    {currentStep.title}
                  </LqText>
                  <LqText variant="small" color="muted" className={styles.description}>
                    {currentStep.description}
                  </LqText>
                </Stack>
              </motion.div>
            </AnimatePresence>
          </Box>

          {/* Footer */}
          <Flex justify="between" align="center" className={styles.footer}>
            <Button variant="ghost" size="sm" onClick={onSkip}>
              Skip Tour
            </Button>
            <Button variant="primary" size="md" onClick={handleNext}>
              {step === totalSteps ? 'Get Started' : 'Next'}
              {step === totalSteps ? (
                <Icon name="CheckCircle" size="sm" />
              ) : (
                <Icon name="ArrowRight" size="sm" />
              )}
            </Button>
          </Flex>
        </Surface>
      </motion.div>
    </Box>
  );
};

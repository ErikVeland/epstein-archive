import React, { useState } from 'react';
import { ArrowRight, Target, BookOpen, CheckCircle, Layers, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseButton } from '../common/CloseButton';
import { useScrollLock } from '../../hooks/useScrollLock';

// UI Library
import { Surface, Button, Flex, Box, Stack, LqText } from '../../design-system/lib';
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
      title: 'Define Strategic Hypotheses',
      description:
        'Initialize theoretical "buckets" on the left. These act as the analytical anchor points for your mission stream.',
      icon: Target,
      tone: 'accent',
    },
    {
      id: 3,
      title: 'Gather & Correlate Signals',
      description:
        'Assigned evidence appears in the central matrix. Drag signals onto hypotheses to establish supporting or contradicting links.',
      icon: Layers,
      tone: 'error',
    },
    {
      id: 3,
      title: 'Sequencing the Narrative',
      description:
        'Finalize the mission by dragging proven points into the Strategic Workspace on the right to construct a sequential chain of proof.',
      icon: BookOpen,
      tone: 'success',
    },
  ];

  const currentStep = steps[step - 1];
  const Icon = currentStep.icon;

  return (
    <Box className={styles.autoGen1} onClick={onSkip}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 30 }}
        transition={{ type: 'spring', duration: 0.6, bounce: 0.4 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Surface variant="panel" style={{ width: 480, padding: 0 }} className={styles.autoGen2}>
          <Stack gap="none" className={styles.autoGen3}>
            {/* Mission Progress HUD */}
            <Box className={styles.autoGen4}>
              <motion.div
                className={styles.autoGen5}
                initial={{ width: '0%' }}
                animate={{ width: `${(step / totalSteps) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </Box>

            {/* Header */}
            <Flex justify="between" align="center" p="lg" className={styles.autoGen6}>
              <Flex gap="md" align="center">
                <Activity size={18} className={styles.autoGen7} />
                <LqText
                  variant="small"
                  weight="bold"
                  color="muted"
                  style={{ textTransform: 'uppercase' }}
                >
                  Workspace Indoctrination
                </LqText>
              </Flex>
              <CloseButton onClick={onSkip} size="sm" />
            </Flex>

            {/* Content Area */}
            <Box p="xxxl" className={styles.contentArea}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Stack align="center" gap="xl" className={styles.autoGen8}>
                    <Box
                      className={styles.stepIconBox}
                      style={{
                        backgroundColor:
                          currentStep.tone === 'error'
                            ? 'var(--lq-error-dim)'
                            : currentStep.tone === 'success'
                              ? 'var(--lq-success-dim)'
                              : 'var(--lq-accent-dim)',
                        color:
                          currentStep.tone === 'error'
                            ? 'var(--lq-error)'
                            : currentStep.tone === 'success'
                              ? 'var(--lq-success)'
                              : 'var(--lq-accent)',
                      }}
                    >
                      <Icon size={48} />
                    </Box>
                    <Stack gap="md">
                      <LqText variant="h2" weight="bold">
                        {currentStep.title}
                      </LqText>
                      <LqText variant="small" color="muted" style={{ lineHeight: '1.6' }}>
                        {currentStep.description}
                      </LqText>
                    </Stack>
                  </Stack>
                </motion.div>
              </AnimatePresence>
            </Box>

            {/* Footer Control Suite */}
            <Surface variant="glass" p="xl" className={styles.autoGen9}>
              <Stack gap="lg">
                <Button variant="secondary" size="sm" onClick={handleNext}>
                  {step === totalSteps ? 'Initialize Investigation' : 'Proceed to Next Phase'}
                  {step === totalSteps ? (
                    <CheckCircle size={18} style={{ marginLeft: '0.5rem' }} />
                  ) : (
                    <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
                  )}
                </Button>

                <Flex justify="center" align="center">
                  <LqText
                    variant="small"
                    color="muted"
                    weight="bold"
                    style={{ textTransform: 'uppercase' }}
                  >
                    Phase {step} of {totalSteps} Synchronization
                  </LqText>
                </Flex>
              </Stack>
            </Surface>
          </Stack>
        </Surface>
      </motion.div>
    </Box>
  );
};

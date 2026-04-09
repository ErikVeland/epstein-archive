import React, { useState } from 'react';
import { ArrowRight, Filter, CheckCircle, Sparkles, Shield, Target, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollLock } from '../../hooks/useScrollLock';
import { Link } from 'react-router-dom';

// UI Library
import { Surface, Button, Flex, Box, Stack, LqText, cn } from '../../design-system/lib';
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
  const totalSteps = 4; // Adding a welcome step for premium feel
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
      title: 'Initialize Mission',
      description:
        'Establish a secure investigation workspace. Define strategic goals and parameters for the mission stream.',
      icon: Target,
      tone: 'accent',
    },
    {
      id: 2,
      title: 'Signal Analysis',
      description:
        'Filter through massive datasets using the Red Flag Index. Focus on priority signals and high-risk intersections.',
      icon: Filter,
      tone: 'error',
    },
    {
      id: 3,
      title: 'Source Verification',
      description:
        'Each analytical claim is linked to its forensic source. Maintain 100% auditability across the case stream.',
      icon: Shield,
      tone: 'success',
    },
    {
      id: 4,
      title: 'Strategic Briefing',
      description:
        'Construct a sequential narrative from correlated evidence. Export professional-grade intelligence artifacts.',
      icon: BookOpen,
      tone: 'accent',
    },
  ];

  const currentStep = steps[step - 1];
  const Icon = currentStep.icon;

  return (
    <Box className={styles.overlay} onClick={onSkip}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 30 }}
        transition={{ type: 'spring', duration: 0.6, bounce: 0.4 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Surface variant="panel" width={520} p="none" className={styles.modal}>
          {/* Decorative Elements */}
          <Box className={styles.topGlow} />

          <Stack gap="none" style={{ height: '100%' }}>
            {/* Header */}
            <Flex justify="between" align="center" p="xl" className={styles.header}>
              <Flex gap="md" align="center">
                <Sparkles size={18} className={styles.iconAccent} />
                <LqText
                  variant="xs"
                  weight="bold"
                  color="muted"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
                >
                  Protocol Induction
                </LqText>
              </Flex>
            </Flex>

            {/* Content Area */}
            <Box className={styles.content}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Stack align="center" gap="xl" textAlign="center">
                    <Box
                      className={cn(
                        'p-6 rounded-3xl',
                        currentStep.tone === 'error'
                          ? 'bg-[var(--lq-error-dim)] text-[var(--lq-error)]'
                          : currentStep.tone === 'success'
                            ? 'bg-[var(--lq-success-dim)] text-[var(--lq-success)]'
                            : 'bg-[var(--lq-accent-dim)] text-[var(--lq-accent)]',
                      )}
                    >
                      <Icon size={48} />
                    </Box>
                    <Stack gap="md">
                      <LqText variant="h2" weight="bold">
                        {currentStep.title}
                      </LqText>
                      <LqText variant="small" color="muted" lineHeight="relaxed">
                        {currentStep.description}
                      </LqText>
                    </Stack>
                  </Stack>
                </motion.div>
              </AnimatePresence>
            </Box>

            {/* Footer */}
            <Surface variant="glass" p="xl" className={styles.footer}>
              <Stack gap="xl">
                <Button variant="secondary" size="md" onClick={handleNext}>
                  {step === totalSteps ? 'Initialize Mission' : 'Synchronize Next Section'}
                  {step === totalSteps ? (
                    <CheckCircle size={18} className="ml-2" />
                  ) : (
                    <ArrowRight size={18} className="ml-2" />
                  )}
                </Button>

                <Flex justify="between" align="center">
                  <Link to="/guide" className={styles.guideLink}>
                    Neural Guide Documentation
                  </Link>
                  <Button variant="ghost" size="sm" onClick={onSkip}>
                    <LqText variant="xs" className={styles.skipButtonText}>
                      Skip Induction Protocol
                    </LqText>
                  </Button>
                </Flex>
              </Stack>
            </Surface>
          </Stack>
        </Surface>
      </motion.div>
    </Box>
  );
};

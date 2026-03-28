import React, { useState } from 'react';
import { ArrowRight, Target, FileText, BookOpen, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseButton } from '../common/CloseButton';
import { useScrollLock } from '../../hooks/useScrollLock';

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
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      glow: 'shadow-purple-500/20',
    },
    {
      id: 2,
      title: 'Gather & Connect Evidence',
      description:
        'Items you "Add to Investigation" from around the app appear in the middle Evidence Pool. Drag them onto Hypotheses to prove or disprove them.',
      icon: FileText,
      color: 'text-[var(--accent)]',
      bg: 'bg-[var(--accent)]/10',
      border: 'border-[var(--accent)]/20',
      glow: 'shadow-blue-500/20',
    },
    {
      id: 3,
      title: 'Build Your Case',
      description:
        'Finally, drag your proven points into the Case Narrative on the right. This organizes your findings into a coherent story ready for export.',
      icon: BookOpen,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      glow: 'shadow-amber-500/20',
    },
  ];

  const currentStep = steps[step - 1];
  const Icon = currentStep.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[var(--glass-bg)] backdrop-blur-md flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
        className="relative surface-glass shadow-[var(--glass-shadow)] w-full max-w-md overflow-hidden"
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 surface-glass">
          <motion.div
            className="h-full bg-[var(--accent)]"
            initial={{ width: '0%' }}
            animate={{ width: `${(step / totalSteps) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Content Area */}
        <div className="p-8 pb-6 flex flex-col items-center text-center">
          <div className="absolute top-4 right-4">
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
              className="flex flex-col items-center"
            >
              <div
                className={`mb-6 p-4 rounded-[var(--radius-xl)] ${currentStep.bg} ${currentStep.border} border shadow-[var(--glass-shadow)] ${currentStep.glow} ring-1 ring-[var(--glass-border)]`}
              >
                <Icon className={`h-8 w-8 ${currentStep.color}`} />
              </div>

              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">
                {currentStep.title}
              </h2>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                {currentStep.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 pt-2 flex flex-col gap-3">
          <button
            onClick={handleNext}
            className="w-full py-3 bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--text-primary)] rounded-[var(--radius-lg)] font-medium shadow-[var(--glass-shadow)] shadow-indigo-900/20 flex items-center justify-center gap-2 transition-all"
          >
            <span>{step === totalSteps ? 'Start Investigating' : 'Next'}</span>
            {step === totalSteps ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
          </button>

          <div className="text-center">
            <span className="text-xs text-[var(--text-primary)]">
              Step {step} of {totalSteps}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

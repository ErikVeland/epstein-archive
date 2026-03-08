import React, { useState } from 'react';
import { ArrowRight, Filter, Search, FileText, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseButton } from '../common/CloseButton';

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
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      glow: 'shadow-blue-500/20',
    },
    {
      id: 2,
      title: 'Filter by Red Flag Index',
      description:
        'Cut through noise using the Red Flag Index to focus on the most significant entities and documents.',
      icon: Filter,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      glow: 'shadow-red-500/20',
    },
    {
      id: 3,
      title: 'Verify Source Documents',
      description:
        'Every insight is linked to its source. Trace connections back to original documents for complete auditability.',
      icon: FileText,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      glow: 'shadow-emerald-500/20',
    },
  ];

  const currentStep = steps[step - 1];
  const Icon = currentStep.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
        className="relative bg-slate-900/90 border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden backdrop-blur-xl"
      >
        {/* Decorative Background Gradients */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center justify-between p-6 pb-2">
          {/* Progress Indicators */}
          <div className="flex gap-1.5">
            {steps.map((s) => (
              <div
                key={s.id}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  s.id === step
                    ? 'w-8 bg-blue-400'
                    : s.id < step
                      ? 'w-1.5 bg-blue-400/50'
                      : 'w-1.5 bg-slate-700'
                }`}
              />
            ))}
          </div>

          <CloseButton
            onClick={onSkip}
            size="md"
            label="Close investigation onboarding"
            className="bg-transparent hover:bg-white/10 border-white/10"
          />
        </div>

        {/* Content Area */}
        <div className="relative px-8 py-8 min-h-[320px] flex flex-col items-center justify-center text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              {/* Icon Container */}
              <div
                className={`mb-8 p-6 rounded-2xl ${currentStep.bg} ${currentStep.border} border shadow-[0_0_30px_-5px] ${currentStep.glow} ring-1 ring-white/5`}
              >
                <Icon className={`h-10 w-10 ${currentStep.color}`} />
              </div>

              <h2 className="text-2xl font-bold text-white mb-3">{currentStep.title}</h2>
              <p className="text-slate-400 text-lg leading-relaxed max-w-xs mx-auto">
                {currentStep.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="relative p-6 pt-0 flex flex-col gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-medium shadow-lg shadow-blue-900/20 border border-t-white/10 flex items-center justify-center gap-2 transition-all group"
          >
            <span>{step === totalSteps ? 'Get Started' : 'Continue'}</span>
            {step === totalSteps ? (
              <CheckCircle className="w-4 h-4 text-white/90" />
            ) : (
              <ArrowRight className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 transition-transform" />
            )}
          </motion.button>

          <a
            href="https://github.com/ErikVeland/epstein-archive/blob/main/INVESTIGATION_GUIDE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 text-center py-1 transition-colors"
          >
            Read the Full Guide
          </a>

          <button
            onClick={onSkip}
            className="text-sm text-slate-500 hover:text-slate-400 py-2 transition-colors"
          >
            Skip Introduction
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

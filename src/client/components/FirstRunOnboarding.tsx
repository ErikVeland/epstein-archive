import React, { useState } from 'react';
import { ArrowRight, Filter, Search, Flag, Plus } from 'lucide-react';
import { CloseButton } from './common/CloseButton';

interface FirstRunOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const FirstRunOnboarding: React.FC<FirstRunOnboardingProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState(1);
  const totalSteps = 4;

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
          icon: <Search className="h-8 w-8 text-[var(--accent-primary)]" />,
        };
      case 2:
        return {
          title: 'Filter by Red Flag Index',
          description:
            'Use the Red Flag Index to cut through noise and focus on the most significant entities and documents in your investigation. Higher ratings indicate stronger evidence connections.',
          icon: <Flag className="h-8 w-8 text-[var(--accent-danger)]" />,
        };
      case 3:
        return {
          title: 'Build Investigations with Evidence',
          description:
            'Add people, documents, and connections to investigations to build comprehensive case files. Everything you add is traceable back to source documents.',
          icon: <Plus className="h-8 w-8 text-[var(--accent-secondary)]" />,
        };
      case 4:
        return {
          title: 'Unlock Advanced Features',
          description:
            'Explore powerful features like network visualization, advanced filtering, and collaborative investigations to deepen your research.',
          icon: <Filter className="h-8 w-8 text-[var(--accent-warning)]" />,
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
    <div className="fixed inset-0 bg-[var(--glass-bg-strong)] backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="glass-panel w-full max-w-2xl rounded-[var(--radius-xl)] overflow-hidden shadow-[var(--glass-shadow)] shadow-cyan-900/20 border border-[var(--glass-border)]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-[var(--glass-border)]">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span className="w-2 h-8 bg-[var(--accent)] rounded-full"></span>
            Getting Started
          </h2>
          <CloseButton
            onClick={handleSkip}
            size="md"
            label="Close onboarding"
            className="bg-transparent hover:bg-[var(--glass-bg)] border-[var(--glass-border)]"
          />
        </div>

        {/* Progress */}
        <div className="px-6 py-4 bg-[var(--glass-bg-strong)]/30">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--text-muted)] mb-2 uppercase tracking-wider">
            <span>
              Step {step} of {totalSteps}
            </span>
            <span className="text-[var(--accent)]">
              {Math.round((step / totalSteps) * 100)}% complete
            </span>
          </div>
          <div className="w-full bg-[var(--glass-bg)] rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(6,182,212,0.5)]"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-8 min-h-[300px] flex flex-col items-center justify-center text-center">
          <div className="mb-8 relative group">
            <div className="absolute inset-0 bg-[var(--accent)]/20 blur-xl rounded-full group-hover:bg-[var(--accent)]/30 transition-all duration-500"></div>
            <div className="relative bg-[var(--glass-bg)]/80 p-6 rounded-[var(--radius-xl)] border border-[var(--glass-border)] shadow-[var(--glass-shadow)] group-hover:scale-110 transition-transform duration-300">
              {React.cloneElement(icon as React.ReactElement, {
                className: 'h-12 w-12 text-[var(--accent)]',
              })}
            </div>
          </div>

          <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-4 neon-text-cyan">
            {title}
          </h3>
          <p className="text-lg text-[var(--text-secondary)] leading-relaxed max-w-lg">
            {description}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 bg-[var(--glass-bg-strong)]/50 border-t border-[var(--glass-border)]">
          <button
            onClick={handleSkip}
            className="px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Skip Tour
          </button>
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Previous
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-[var(--text-primary)] rounded-[var(--radius-lg)] font-medium shadow-[var(--glass-shadow)] shadow-cyan-900/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              {step === totalSteps ? 'Get Started' : 'Next'}
              {step !== totalSteps && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

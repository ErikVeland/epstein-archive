import { useState, useCallback } from 'react';

export interface UseOnboardingReturn {
  shouldShowOnboarding: boolean;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
  onboardingCompleted: boolean;
}

const ONBOARDING_KEY = 'epstein_onboarding_completed';

function getInitialOnboardingState(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  } catch {
    return false;
  }
}

export function useOnboarding(): UseOnboardingReturn {
  const [onboardingCompleted, setOnboardingCompleted] =
    useState<boolean>(getInitialOnboardingState);

  const completeOnboarding = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // Ignore localStorage errors
    }
    setOnboardingCompleted(true);
  }, []);

  const skipOnboarding = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // Ignore localStorage errors
    }
    setOnboardingCompleted(true);
  }, []);

  return {
    shouldShowOnboarding: !onboardingCompleted,
    completeOnboarding,
    skipOnboarding,
    onboardingCompleted,
  };
}

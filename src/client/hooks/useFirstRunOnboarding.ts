import { useState } from 'react';

export const useFirstRunOnboarding = () => {
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (typeof navigator !== 'undefined' && navigator.webdriver) {
      localStorage.setItem('firstRunOnboardingCompleted', 'true');
      localStorage.setItem('board_onboarding_seen', 'true');
      return false;
    }
    return !localStorage.getItem('firstRunOnboardingCompleted');
  });

  const completeOnboarding = () => {
    localStorage.setItem('firstRunOnboardingCompleted', 'true');
    setShouldShowOnboarding(false);
  };

  const skipOnboarding = () => {
    localStorage.setItem('firstRunOnboardingCompleted', 'true');
    setShouldShowOnboarding(false);
  };

  return {
    shouldShowOnboarding,
    completeOnboarding,
    skipOnboarding,
  };
};

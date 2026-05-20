import { useEffect } from 'react';

export function useMobileGlobalToggles(params: {
  setIsMobileMenuOpen: (next: boolean | ((prev: boolean) => boolean)) => void;
  setIsMobileSearchOpen: (next: boolean | ((prev: boolean) => boolean)) => void;
  setShowReleaseNotes: (next: boolean | ((prev: boolean) => boolean)) => void;
}) {
  useEffect(() => {
    const handleToggleMobileMenu = () => params.setIsMobileMenuOpen((v) => !v);
    const handleToggleMobileSearch = () => params.setIsMobileSearchOpen((v) => !v);
    const handleToggleReleaseNotes = () => params.setShowReleaseNotes((v) => !v);
    window.addEventListener('toggleMobileMenu', handleToggleMobileMenu);
    window.addEventListener('toggleMobileSearch', handleToggleMobileSearch);
    window.addEventListener('toggleReleaseNotes', handleToggleReleaseNotes);
    return () => {
      window.removeEventListener('toggleMobileMenu', handleToggleMobileMenu);
      window.removeEventListener('toggleMobileSearch', handleToggleMobileSearch);
      window.removeEventListener('toggleReleaseNotes', handleToggleReleaseNotes);
    };
  }, [params]);
}

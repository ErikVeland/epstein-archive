import { useState, useEffect } from 'react';

type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | 'mobile' | 'tablet' | 'desktop';

const BREAKPOINTS: Record<Breakpoint, string> = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
};

export function useResponsive() {
  const [breakpoints, setBreakpoints] = useState<Record<Breakpoint, boolean>>(() => {
    if (typeof window === 'undefined') {
      return {
        sm: false,
        md: false,
        lg: false,
        xl: false,
        mobile: true,
        tablet: false,
        desktop: false,
      };
    }
    return {
      sm: window.matchMedia(BREAKPOINTS.sm).matches,
      md: window.matchMedia(BREAKPOINTS.md).matches,
      lg: window.matchMedia(BREAKPOINTS.lg).matches,
      xl: window.matchMedia(BREAKPOINTS.xl).matches,
      mobile: window.matchMedia(BREAKPOINTS.mobile).matches,
      tablet: window.matchMedia(BREAKPOINTS.tablet).matches,
      desktop: window.matchMedia(BREAKPOINTS.desktop).matches,
    };
  });

  useEffect(() => {
    const mqls: Record<Breakpoint, MediaQueryList> = {} as Record<Breakpoint, MediaQueryList>;

    const handleChange = () => {
      setBreakpoints({
        sm: window.matchMedia(BREAKPOINTS.sm).matches,
        md: window.matchMedia(BREAKPOINTS.md).matches,
        lg: window.matchMedia(BREAKPOINTS.lg).matches,
        xl: window.matchMedia(BREAKPOINTS.xl).matches,
        mobile: window.matchMedia(BREAKPOINTS.mobile).matches,
        tablet: window.matchMedia(BREAKPOINTS.tablet).matches,
        desktop: window.matchMedia(BREAKPOINTS.desktop).matches,
      });
    };

    (Object.keys(BREAKPOINTS) as Breakpoint[]).forEach((bp) => {
      mqls[bp] = window.matchMedia(BREAKPOINTS[bp]);
      mqls[bp].addEventListener('change', handleChange);
    });

    return () => {
      (Object.keys(BREAKPOINTS) as Breakpoint[]).forEach((bp) => {
        mqls[bp].removeEventListener('change', handleChange);
      });
    };
  }, []);

  return breakpoints;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export const BREAKPOINT_VALUES = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  mobile: 767,
  tablet: 1023,
  desktop: 1024,
} as const;

export function useIsMobile(): boolean {
  const { mobile } = useResponsive();
  return mobile;
}

export function useIsTablet(): boolean {
  const { tablet } = useResponsive();
  return tablet;
}

export function useIsDesktop(): boolean {
  const { desktop } = useResponsive();
  return desktop;
}

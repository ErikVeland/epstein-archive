import React from 'react';
import { useResponsive, useMediaQuery, useIsMobile, useIsTablet, useIsDesktop } from '../../../hooks/useResponsive';
import { cn } from '../../lib';

export interface ResponsiveProps {
  children: React.ReactNode;
  className?: string;
  /** Show only on mobile (max-width: 767px) */
  mobile?: boolean;
  /** Show only on tablet (768px - 1023px) */
  tablet?: boolean;
  /** Show only on desktop (min-width: 1024px) */
  desktop?: boolean;
  /** Hide on mobile */
  hideMobile?: boolean;
  /** Hide on tablet */
  hideTablet?: boolean;
  /** Hide on desktop */
  hideDesktop?: boolean;
  /** Custom media query */
  when?: string;
}

/**
 * Responsive wrapper component that conditionally renders children
 * based on viewport breakpoints. Uses mobile-first approach.
 */
export function Responsive({
  children,
  className,
  mobile,
  tablet,
  desktop,
  hideMobile,
  hideTablet,
  hideDesktop,
  when,
}: ResponsiveProps) {
  const { mobile: isMobile, tablet: isTablet, desktop: isDesktop } = useResponsive();
  const customMatch = useMediaQuery(when || '(min-width: 0px)');

  const shouldRender = React.useMemo(() => {
    if (when && !customMatch) return false;
    if (mobile && !isMobile) return false;
    if (tablet && !isTablet) return false;
    if (desktop && !isDesktop) return false;
    if (hideMobile && isMobile) return false;
    if (hideTablet && isTablet) return false;
    if (hideDesktop && isDesktop) return false;
    return true;
  }, [
    mobile,
    tablet,
    desktop,
    hideMobile,
    hideTablet,
    hideDesktop,
    isMobile,
    isTablet,
    isDesktop,
    when,
    customMatch,
  ]);

  if (!shouldRender) return null;

  return <div className={cn(className)}>{children}</div>;
}

  return <div className={cn(className)}>{children}</div>;
}

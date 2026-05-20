import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { NavigateFunction } from 'react-router-dom';
import { preloader } from '@client/utils/ResourcePreloader';
import { cn } from '@client/utils/cn';
import {
  AppSegmentedNav,
  AppSegmentedNavItem,
  Box,
  Button,
  Flex,
  LqText,
  Surface,
} from '@client/design-system/lib';
import styles from '@client/App.module.css';

export function SegmentedNav(props: {
  activeTab: string;
  navigate: NavigateFunction;
  shouldShowOnboarding: boolean;
}) {
  const navTrackRef = useRef<HTMLDivElement | null>(null);
  const [navEdgeFade, setNavEdgeFade] = useState({ left: false, right: false });
  const [navLayoutMode, setNavLayoutMode] = useState<'normal' | 'compact' | 'icons'>('normal');

  const [investigateAttract, setInvestigateAttract] = useState(false);
  const [investigatePopoverOpen, setInvestigatePopoverOpen] = useState(false);
  const investigateBtnRef = useRef<HTMLButtonElement | null>(null);
  const [investigatePopoverPos, setInvestigatePopoverPos] = useState({ x: 0, y: 0 });
  const [investigateArrowLeft, setInvestigateArrowLeft] = useState(16);

  const [attractShown, setAttractShown] = useState(false);
  const canShowAttract = useMemo(() => {
    try {
      const shown = localStorage.getItem('investigate_attract_shown') === 'true';
      const hasSeenInvestigationOnboarding =
        localStorage.getItem('hasSeenInvestigationOnboarding') === 'true';
      const hasSeenBoardOnboarding = localStorage.getItem('board_onboarding_seen') === 'true';
      return (
        !shown &&
        !attractShown &&
        !props.shouldShowOnboarding &&
        hasSeenInvestigationOnboarding &&
        hasSeenBoardOnboarding
      );
    } catch {
      return false;
    }
  }, [props.shouldShowOnboarding, attractShown]);

  const [prevCanShowAttract, setPrevCanShowAttract] = useState(false);
  if (canShowAttract !== prevCanShowAttract) {
    setPrevCanShowAttract(canShowAttract);
    if (canShowAttract) {
      setInvestigateAttract(true);
      setAttractShown(true);
      try {
        localStorage.setItem('investigate_attract_shown', 'true');
      } catch (e) {
        void e;
      }
    }
  }

  useEffect(() => {
    if (investigateAttract) {
      const t = setTimeout(() => setInvestigateAttract(false), 8000);
      return () => clearTimeout(t);
    }
  }, [investigateAttract]);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('investigate_popover_dismissed') === 'true';
      const hasSeenInvestigationOnboarding =
        localStorage.getItem('hasSeenInvestigationOnboarding') === 'true';
      const hasSeenBoardOnboarding = localStorage.getItem('board_onboarding_seen') === 'true';
      const isMobile = window.innerWidth < 768;

      if (
        !dismissed &&
        props.activeTab === 'people' &&
        !props.shouldShowOnboarding &&
        hasSeenInvestigationOnboarding &&
        hasSeenBoardOnboarding &&
        !isMobile
      ) {
        const timer = setTimeout(() => setInvestigatePopoverOpen(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      void e;
    }
  }, [props.activeTab, props.shouldShowOnboarding]);

  const updatePopoverPos = useCallback(() => {
    if (!investigatePopoverOpen) return;
    const anchor =
      (document.querySelector('[data-investigation-nav-top]') as HTMLElement) ||
      (document.querySelector('[data-investigation-nav]') as HTMLElement) ||
      investigateBtnRef.current;
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      const x = Math.round(rect.left + window.scrollX);
      const y = Math.round(rect.bottom + 8 + window.scrollY);

      setInvestigatePopoverPos((prev) => (prev.x === x && prev.y === y ? prev : { x, y }));

      const centerX = rect.left + rect.width / 2 + window.scrollX;
      const arrowX = Math.max(12, Math.min(300 - 12, centerX - x - 8));
      setInvestigateArrowLeft((prev) => (prev === arrowX ? prev : arrowX));
    }
  }, [investigatePopoverOpen]);

  useLayoutEffect(() => {
    if (investigatePopoverOpen) {
      const handle = requestAnimationFrame(updatePopoverPos);
      return () => cancelAnimationFrame(handle);
    }
  }, [investigatePopoverOpen, updatePopoverPos]);

  useEffect(() => {
    window.addEventListener('resize', updatePopoverPos);
    window.addEventListener('scroll', updatePopoverPos, { passive: true });
    const id = setInterval(updatePopoverPos, 300);
    return () => {
      window.removeEventListener('resize', updatePopoverPos);
      window.removeEventListener('scroll', updatePopoverPos);
      clearInterval(id);
    };
  }, [updatePopoverPos]);

  useEffect(() => {
    const track = navTrackRef.current;
    if (!track) return;

    const updateEdgeFade = () => {
      const width = track.clientWidth;
      const mode: 'normal' | 'compact' | 'icons' =
        width < 1080 ? 'icons' : width < 1440 ? 'compact' : 'normal';
      setNavLayoutMode((prev) => (prev === mode ? prev : mode));

      const overflowPx = track.scrollWidth - track.clientWidth;
      const hasOverflow = overflowPx > 12;
      const left = hasOverflow && track.scrollLeft > 6;
      const right = hasOverflow && track.scrollLeft + track.clientWidth < track.scrollWidth - 6;
      setNavEdgeFade((prev) =>
        prev.left === left && prev.right === right ? prev : { left, right },
      );
    };

    updateEdgeFade();
    track.addEventListener('scroll', updateEdgeFade, { passive: true });
    window.addEventListener('resize', updateEdgeFade);

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateEdgeFade) : null;
    if (resizeObserver) {
      resizeObserver.observe(track);
      if (track.firstElementChild instanceof HTMLElement) {
        resizeObserver.observe(track.firstElementChild);
      }
    }

    return () => {
      track.removeEventListener('scroll', updateEdgeFade);
      window.removeEventListener('resize', updateEdgeFade);
      resizeObserver?.disconnect();
    };
  }, []);

  const navItems = useMemo(
    () =>
      [
        {
          key: 'documents',
          path: '/documents',
          tone: 'documents',
          active: 'documents',
          icon: 'FileText',
          label: 'Documents',
          onMouseEnter: undefined,
        },
        {
          key: 'redactions',
          path: '/redactions',
          tone: 'documents',
          active: 'redactions',
          icon: 'ScanText',
          label: 'Redactions',
          onMouseEnter: () =>
            preloader.prefetchJson('/api/documents?hasFailedRedactions=true&limit=25'),
        },
        {
          key: 'media',
          path: '/media',
          tone: 'media',
          active: 'media',
          icon: 'Newspaper',
          label: 'Media',
          onMouseEnter: () => {
            preloader.prefetchJson('/api/media/albums');
            preloader.prefetchJson('/api/media/images?limit=24');
          },
        },
        {
          key: 'emails',
          path: '/emails',
          tone: 'emails',
          active: 'emails',
          icon: 'Mail',
          label: 'Emails',
          onMouseEnter: () => preloader.prefetchJson('/api/emails'),
        },
        {
          key: 'flights',
          path: '/flights',
          tone: 'flights',
          active: 'flights',
          icon: 'Navigation',
          label: 'Flights',
          onMouseEnter: () => preloader.prefetchJson('/api/flights'),
        },
        {
          key: 'properties',
          path: '/properties',
          tone: 'properties',
          active: 'properties',
          icon: 'Building',
          label: 'Properties',
          onMouseEnter: () => preloader.prefetchJson('/api/properties/stats'),
        },
        {
          key: 'blackbook',
          path: '/blackbook',
          tone: 'blackbook',
          active: 'blackbook',
          icon: 'BookOpen',
          label: 'Black Book',
          onMouseEnter: () => preloader.prefetchJson('/api/media/albums'),
        },
        {
          key: 'timeline',
          path: '/timeline',
          tone: 'timeline',
          active: 'timeline',
          icon: 'Clock',
          label: 'Timeline',
          onMouseEnter: () => preloader.prefetchJson('/api/timeline'),
        },
        {
          key: 'financial',
          path: '/financial',
          tone: 'financial',
          active: 'financial',
          icon: 'DollarSign',
          label: 'Financial',
          onMouseEnter: () => preloader.prefetchJson('/api/financial/transactions?limit=100'),
        },
        {
          key: 'analytics',
          path: '/analytics',
          tone: 'analytics',
          active: 'analytics',
          icon: 'BarChart3',
          label: 'Analytics',
          onMouseEnter: undefined,
        },
        {
          key: 'about',
          path: '/about',
          tone: 'about',
          active: 'about',
          icon: 'Shield',
          label: 'About',
          onMouseEnter: undefined,
        },
      ] as const,
    [],
  );

  return (
    <Box id="navigation" mb={6} className={styles.navShell}>
      <div className={styles.navWrap}>
        <div ref={navTrackRef} className={styles.navTrack}>
          <AppSegmentedNav density={navLayoutMode}>
            <AppSegmentedNavItem
              onClick={() => props.navigate('/people')}
              tone="people"
              active={props.activeTab === 'people'}
              density={navLayoutMode}
              icon="Users"
              label="People"
            />
            <AppSegmentedNavItem
              onClick={() => {
                try {
                  localStorage.setItem('investigate_attract_shown', 'true');
                  localStorage.setItem('investigate_popover_dismissed', 'true');
                } catch (err) {
                  void err;
                }
                setInvestigateAttract(false);
                setInvestigatePopoverOpen(false);
                props.navigate('/investigations');
              }}
              tone="investigations"
              active={props.activeTab === 'investigations'}
              density={navLayoutMode}
              icon="Target"
              label="Investigations"
              wrapperClassName={styles.navItemRelative}
              className={cn(
                investigateAttract && props.activeTab !== 'investigations'
                  ? styles.investigationPulse
                  : '',
              )}
              aria-haspopup="dialog"
              aria-expanded={investigatePopoverOpen}
              ref={investigateBtnRef}
              data-investigation-nav-top
            />
            {investigatePopoverOpen &&
              props.activeTab !== 'investigations' &&
              investigatePopoverPos.x !== 0 &&
              createPortal(
                <Surface
                  variant="glass-strong"
                  p={4}
                  style={{
                    position: 'fixed',
                    width: '320px',
                    left: investigatePopoverPos.x,
                    top: investigatePopoverPos.y,
                    zIndex: 50,
                  }}
                  className={styles.popoverSurface}
                >
                  <div
                    className={styles.popoverPointer}
                    style={{ left: `${investigateArrowLeft}px` }}
                  >
                    <div className={styles.popoverPointerDiamond} />
                  </div>
                  <Box mb={1}>
                    <LqText weight="semibold">Investigations</LqText>
                  </Box>
                  <Box mb={3}>
                    <LqText variant="small" color="secondary">
                      Create and manage deep-dive investigations, link evidence, and track findings.
                    </LqText>
                  </Box>
                  <Flex align="center" gap={2}>
                    <Button
                      unstyled
                      className={styles.popoverButton}
                      onClick={() => {
                        try {
                          localStorage.setItem('investigate_popover_dismissed', 'true');
                        } catch (err) {
                          void err;
                        }
                        setInvestigatePopoverOpen(false);
                        setInvestigateAttract(false);
                      }}
                    >
                      Got it
                    </Button>
                    <Button
                      unstyled
                      className={cn(styles.popoverButton, styles.popoverButtonPrimary)}
                      onClick={() => {
                        try {
                          localStorage.setItem('investigate_popover_dismissed', 'true');
                          localStorage.setItem('investigate_attract_shown', 'true');
                        } catch (err) {
                          void err;
                        }
                        setInvestigatePopoverOpen(false);
                        setInvestigateAttract(false);
                        props.navigate('/investigations');
                      }}
                    >
                      Try it
                    </Button>
                  </Flex>
                </Surface>,
                document.body,
              )}
            {navItems.map((item) => (
              <AppSegmentedNavItem
                key={item.key}
                onClick={() => props.navigate(item.path)}
                onMouseEnter={item.onMouseEnter}
                tone={item.tone}
                active={props.activeTab === item.active}
                density={navLayoutMode}
                icon={item.icon}
                label={item.label}
              />
            ))}
          </AppSegmentedNav>
        </div>
        {navEdgeFade.left && <div className={cn(styles.navEdgeFade, styles.navEdgeFadeLeft)} />}
        {navEdgeFade.right && <div className={cn(styles.navEdgeFade, styles.navEdgeFadeRight)} />}
      </div>
    </Box>
  );
}

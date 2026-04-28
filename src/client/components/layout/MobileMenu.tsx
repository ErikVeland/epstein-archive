import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import s from './MobileMenu.module.css';
import Icon from '../common/Icon';
import { CloseButton } from '../common/CloseButton';
import { useAuth } from '../../contexts/AuthContext';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useSensitiveSettings } from '../../contexts/SensitiveSettingsContext';

import { Button, SearchField } from '../../design-system/lib';

interface MobileMenuProps {
  open: boolean;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onNavigate: (path: string) => void;
  onClose: () => void;
  onSearch?: (term: string) => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  open,
  searchTerm,
  onSearchTermChange,
  onNavigate,
  onClose,
  onSearch,
}) => {
  const { showAllSensitive, toggleShowAllSensitive } = useSensitiveSettings();
  const [attract, setAttract] = useState(() => {
    if (typeof window === 'undefined') return false;
    const shown = localStorage.getItem('investigate_attract_shown') === 'true';
    const firstRunCompleted = localStorage.getItem('firstRunOnboardingCompleted') === 'true';
    const investigationOnboardingSeen =
      localStorage.getItem('hasSeenInvestigationOnboarding') === 'true';
    const boardOnboardingSeen = localStorage.getItem('board_onboarding_seen') === 'true';

    return !shown && firstRunCompleted && investigationOnboardingSeen && boardOnboardingSeen;
  });

  const { isAdmin } = useAuth();
  useScrollLock(open);

  useEffect(() => {
    if (attract) {
      try {
        localStorage.setItem('investigate_attract_shown', 'true');
      } catch {
        // ignore
      }
      const timer = setTimeout(() => setAttract(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [attract]);

  // Ensure mobile menu doesn't linger when viewport switches to desktop.
  useEffect(() => {
    if (!open) return;

    const closeOnDesktop = () => {
      if (window.innerWidth >= 768) onClose();
    };

    closeOnDesktop();
    window.addEventListener('resize', closeOnDesktop);
    return () => window.removeEventListener('resize', closeOnDesktop);
  }, [open, onClose]);

  // Handle Escape key to close menu
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  // Handle navigation without closing on content click
  const handleNavigation = (path: string) => {
    onNavigate(path);
    onClose();
  };

  return (
    <div className={`mobile-nav ${s.root} ${open ? s.rootOpen : s.rootClosed}`}>
      {/* Backdrop overlay - closes menu when clicked */}
      <Button
        unstyled
        type="button"
        aria-label="Close menu"
        className={`app-backdrop ${s.backdrop}`}
        onClick={onClose}
      />

      {/* Menu panel - on top of backdrop */}
      <div
        className={`${s.panel} ${open ? '' : s.panelClosed}`}
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside menu from closing it
        onTouchStart={(e) => {
          const startX = e.touches[0].clientX;
          const startY = e.touches[0].clientY;
          const handleTouchMove = (moveEvent: TouchEvent) => {
            const currentX = moveEvent.touches[0].clientX;
            const currentY = moveEvent.touches[0].clientY;
            const deltaX = currentX - startX; // Positive if swiping right
            const deltaY = currentY - startY;
            if (deltaX > 50 && Math.abs(deltaX) > Math.abs(deltaY)) onClose();
          };
          const cleanup = () => {
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', cleanup);
          };
          window.addEventListener('touchmove', handleTouchMove);
          window.addEventListener('touchend', cleanup);
        }}
      >
        <div className={s.panelHeader}>
          <h3 className={s.panelTitle}>
            <Icon name="Menu" size="sm" className={s.panelTitleIcon} />
            Navigation
          </h3>
          <CloseButton onClick={onClose} size="sm" label="Close menu" className={s.closeBtn} />
        </div>

        {/* Mobile Search Input */}
        <div className={s.searchSection}>
          <SearchField
            type="text"
            placeholder="Search people, documents..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const query = searchTerm.trim();
                if (query && onSearch) {
                  onSearch(query);
                  onClose();
                } else if (query) {
                  handleNavigation(`/search?q=${encodeURIComponent(query)}`);
                }
              }
            }}
            rootClassName={s.searchFieldRoot}
          />
        </div>

        {/* Scrollable Content Area - flex-1 takes remaining height */}
        <div className={`${s.navList} custom-scrollbar`}>
          <Button
            unstyled
            className={`${s.navItem} ${s.navItemHome}`}
            onClick={() => handleNavigation('/')}
          >
            <div className={s.iconWrap}>
              <Icon name="Home" size="sm" />
            </div>
            <span className={s.navLabel}>Home</span>
          </Button>

          <div className={`${s.sectionLabel} ${s.sectionLabelTop}`}>Explore</div>

          <Button
            unstyled
            className={`${s.navItem} ${s.navItemSlide} ${s.navItemPeople}`}
            onClick={() => handleNavigation('/people')}
          >
            <div className={s.iconWrap}>
              <Icon name="Users" size="sm" className={s.iconPeople} />
            </div>
            <span className={s.navLabel}>People</span>
          </Button>
          <Button
            unstyled
            className={`${s.navItem} ${s.navItemInvestigations} ${attract ? s.navItemAttract : ''}`}
            onClick={() => {
              try {
                localStorage.setItem('investigate_attract_shown', 'true');
              } catch {
                // Ignore localStorage errors
              }
              setAttract(false);
              handleNavigation('/investigations');
            }}
          >
            <div className={`${s.iconWrap} ${s.iconWrapInvestigations}`}>
              <Icon name="Target" size="sm" className={s.iconInvestigations} />
            </div>
            <div className={s.navLabelGroup}>
              <span className={s.navLabel}>Investigations</span>
            </div>
          </Button>
          <Button
            unstyled
            className={`${s.navItem} ${s.navItemSlide} ${s.navItemDocuments}`}
            onClick={() => handleNavigation('/documents')}
          >
            <div className={s.iconWrap}>
              <Icon name="FileText" size="sm" className={s.iconDocuments} />
            </div>
            <span className={s.navLabel}>Documents</span>
          </Button>
          <Button
            unstyled
            className={`${s.navItem} ${s.navItemSlide} ${s.navItemMedia}`}
            onClick={() => handleNavigation('/media')}
          >
            <div className={s.iconWrap}>
              <Icon name="Newspaper" size="sm" className={s.iconMedia} />
            </div>
            <span className={s.navLabel}>Media</span>
          </Button>

          <div className={s.divider} />
          <div className={`${s.sectionLabel} ${s.sectionLabelMid}`}>Intelligence</div>

          <Button
            unstyled
            className={`${s.navItem} ${s.navItemSlide} ${s.navItemEmails}`}
            onClick={() => handleNavigation('/emails')}
          >
            <div className={s.iconWrap}>
              <Icon name="Mail" size="sm" className={s.iconEmails} />
            </div>
            <span className={s.navLabel}>Emails</span>
          </Button>
          <Button unstyled className={s.navItem} onClick={() => handleNavigation('/flights')}>
            <div className={`${s.iconWrap} ${s.iconWrapFlights}`}>
              <Icon name="Navigation" size="sm" className={s.iconFlights} />
            </div>
            <span className={s.navLabel}>Flights</span>
          </Button>
          <Button unstyled className={s.navItem} onClick={() => handleNavigation('/properties')}>
            <div className={s.iconWrap}>
              <Icon name="Building" size="sm" />
            </div>
            <span className={s.navLabel}>Properties</span>
          </Button>
          <Button
            unstyled
            className={`${s.navItem} ${s.navItemBlackBook}`}
            onClick={() => handleNavigation('/blackbook')}
          >
            <div className={`${s.iconWrap} ${s.iconWrapBlackBook}`}>
              <Icon name="Book" size="sm" />
            </div>
            <span className={s.navLabel}>Black Book</span>
          </Button>
          <Button
            unstyled
            className={`${s.navItem} ${s.navItemTimeline}`}
            onClick={() => handleNavigation('/timeline')}
          >
            <div className={`${s.iconWrap} ${s.iconWrapTimeline}`}>
              <Icon name="Clock" size="sm" className={s.iconTimeline} />
            </div>
            <span className={s.navLabel}>Timeline</span>
          </Button>
          <Button
            unstyled
            className={`${s.navItem} ${s.navItemFinancial}`}
            onClick={() => handleNavigation('/financial')}
          >
            <div className={`${s.iconWrap} ${s.iconWrapFinancial}`}>
              <Icon name="DollarSign" size="sm" className={s.iconFinancial} />
            </div>
            <span className={s.navLabel}>Financial</span>
          </Button>
          <Button
            unstyled
            className={`${s.navItem} ${s.navItemAnalytics}`}
            onClick={() => handleNavigation('/analytics')}
          >
            <div className={`${s.iconWrap} ${s.iconWrapAnalytics}`}>
              <Icon name="BarChart3" size="sm" className={s.iconAnalytics} />
            </div>
            <span className={s.navLabel}>Analytics</span>
          </Button>

          <div className={s.divider} />

          <Button
            unstyled
            className={`${s.navItem} ${s.navItemAbout}`}
            onClick={() => handleNavigation('/about')}
          >
            <div className={`${s.iconWrap} ${s.iconWrapAbout}`}>
              <Icon name="Shield" size="sm" />
            </div>
            <span className={s.navLabel}>About</span>
          </Button>
          <Button
            unstyled
            className={`${s.navItem} ${s.navItemAbout}`}
            onClick={() => {
              onClose();
              window.dispatchEvent(new CustomEvent('toggleReleaseNotes'));
            }}
          >
            <div className={`${s.iconWrap} ${s.iconWrapAbout}`}>
              <Icon name="Book" size="sm" />
            </div>
            <span className={s.navLabel}>What's New</span>
          </Button>

          {isAdmin && (
            <Button
              unstyled
              className={`${s.navItem} ${s.navItemAbout}`}
              onClick={() => handleNavigation('/admin')}
            >
              <div className={`${s.iconWrap} ${s.iconWrapAbout}`}>
                <Icon name="Settings" size="sm" />
              </div>
              <span className={s.navLabel}>Admin</span>
            </Button>
          )}
        </div>

        {/* Footer - Flex item at bottom */}
        <div className={s.panelFooter}>
          <div className={s.footerActions}>
            <Button
              unstyled
              className={`${s.footerToggle} ${showAllSensitive ? s.footerToggleActive : ''}`}
              onClick={() => {
                toggleShowAllSensitive();
              }}
              title={showAllSensitive ? 'Hide sensitive content' : 'Show sensitive content'}
            >
              <Icon name={showAllSensitive ? 'Eye' : 'EyeOff'} size="xs" />
              <span>{showAllSensitive ? 'Sensitive: Visible' : 'Sensitive: Hidden'}</span>
            </Button>
          </div>
          <div className={s.footerLinks}>
            <Link to="/privacy" className={s.footerLink} onClick={onClose}>
              Privacy
            </Link>
            <span className={s.footerDot} aria-hidden="true">
              ·
            </span>
            <Link to="/terms" className={s.footerLink} onClick={onClose}>
              Terms
            </Link>
          </div>
          <p className={s.versionText}>v{__APP_VERSION__} &bull; Epstein Archive</p>
        </div>
      </div>
    </div>
  );
};

export default MobileMenu;

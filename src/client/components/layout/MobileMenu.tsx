import React, { useState, useEffect } from 'react';
import s from './MobileMenu.module.css';
import Icon from '../common/Icon';
import { CloseButton } from '../common/CloseButton';
import { useAuth } from '../../contexts/AuthContext';
import { useScrollLock } from '../../hooks/useScrollLock';

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
  const [attract, setAttract] = useState<boolean>(false);
  const { isAdmin } = useAuth();
  useScrollLock(open);

  useEffect(() => {
    const shown =
      typeof window !== 'undefined' && localStorage.getItem('investigate_attract_shown') === 'true';
    const firstRunCompleted = localStorage.getItem('firstRunOnboardingCompleted') === 'true';
    const investigationOnboardingSeen =
      localStorage.getItem('hasSeenInvestigationOnboarding') === 'true';
    const boardOnboardingSeen = localStorage.getItem('board_onboarding_seen') === 'true';
    const canAttract =
      !shown && firstRunCompleted && investigationOnboardingSeen && boardOnboardingSeen;
    setAttract(canAttract);
    const timer = setTimeout(() => setAttract(false), 8000);
    return () => clearTimeout(timer);
  }, []);

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

  // Handle navigation without closing on content click
  const handleNavigation = (path: string) => {
    onNavigate(path);
    onClose();
  };

  return (
    <div className={`mobile-nav ${s.root} ${open ? s.rootOpen : s.rootClosed}`}>
      {/* Backdrop overlay - closes menu when clicked */}
      <button
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
          const handleTouchMove = (moveEvent: TouchEvent) => {
            if (startX - moveEvent.touches[0].clientX > 50) onClose();
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
          <div className={s.searchWrap}>
            <input
              type="text"
              placeholder="Search people, documents..."
              className={s.searchInput}
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
            />
            <div className={s.searchIconWrap}>
              <Icon name="Search" size="xs" />
            </div>
          </div>
        </div>

        {/* Scrollable Content Area - flex-1 takes remaining height */}
        <div className={`${s.navList} custom-scrollbar`}>
          <button className={`${s.navItem} ${s.navItemHome}`} onClick={() => handleNavigation('/')}>
            <div className={s.iconWrap}>
              <Icon name="Home" size="sm" />
            </div>
            <span className={s.navLabel}>Home</span>
          </button>

          <div className={`${s.sectionLabel} ${s.sectionLabelTop}`}>Explore</div>

          <button
            className={`${s.navItem} ${s.navItemSlide} ${s.navItemPeople}`}
            onClick={() => handleNavigation('/people')}
          >
            <div className={s.iconWrap}>
              <Icon name="Users" size="sm" className={s.iconPeople} />
            </div>
            <span className={s.navLabel}>People</span>
          </button>
          <button
            className={`${s.navItem} ${s.navItemSlide} ${s.navItemDocuments}`}
            onClick={() => handleNavigation('/documents')}
          >
            <div className={s.iconWrap}>
              <Icon name="FileText" size="sm" className={s.iconDocuments} />
            </div>
            <span className={s.navLabel}>Documents</span>
          </button>
          <button
            className={`${s.navItem} ${s.navItemSlide} ${s.navItemEmails}`}
            onClick={() => handleNavigation('/emails')}
          >
            <div className={s.iconWrap}>
              <Icon name="Mail" size="sm" className={s.iconEmails} />
            </div>
            <span className={s.navLabel}>Emails</span>
          </button>
          <button
            className={`${s.navItem} ${s.navItemSlide} ${s.navItemMedia}`}
            onClick={() => handleNavigation('/media')}
          >
            <div className={s.iconWrap}>
              <Icon name="Newspaper" size="sm" className={s.iconMedia} />
            </div>
            <span className={s.navLabel}>Media</span>
          </button>

          <div className={s.divider} />
          <div className={`${s.sectionLabel} ${s.sectionLabelMid}`}>Intelligence</div>

          <button
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
          </button>
          <button
            className={`${s.navItem} ${s.navItemBlackBook}`}
            onClick={() => handleNavigation('/blackbook')}
          >
            <div className={`${s.iconWrap} ${s.iconWrapBlackBook}`}>
              <Icon name="Book" size="sm" />
            </div>
            <span className={s.navLabel}>Black Book</span>
          </button>
          <button
            className={`${s.navItem} ${s.navItemTimeline}`}
            onClick={() => handleNavigation('/timeline')}
          >
            <div className={`${s.iconWrap} ${s.iconWrapTimeline}`}>
              <Icon name="Clock" size="sm" className={s.iconTimeline} />
            </div>
            <span className={s.navLabel}>Timeline</span>
          </button>
          <button
            className={`${s.navItem} ${s.navItemFlights}`}
            onClick={() => handleNavigation('/flights')}
          >
            <div className={`${s.iconWrap} ${s.iconWrapFlights}`}>
              <Icon name="Navigation" size="sm" className={s.iconFlights} />
            </div>
            <span className={s.navLabel}>Flights</span>
          </button>
          <button
            className={`${s.navItem} ${s.navItemAnalytics}`}
            onClick={() => handleNavigation('/analytics')}
          >
            <div className={`${s.iconWrap} ${s.iconWrapAnalytics}`}>
              <Icon name="BarChart3" size="sm" className={s.iconAnalytics} />
            </div>
            <span className={s.navLabel}>Analytics</span>
          </button>

          <div className={s.divider} />

          <button
            className={`${s.navItem} ${s.navItemAbout}`}
            onClick={() => handleNavigation('/about')}
          >
            <div className={`${s.iconWrap} ${s.iconWrapAbout}`}>
              <Icon name="Shield" size="sm" />
            </div>
            <span className={s.navLabel}>About</span>
          </button>

          {isAdmin && (
            <button
              className={`${s.navItem} ${s.navItemAbout}`}
              onClick={() => handleNavigation('/admin')}
            >
              <div className={`${s.iconWrap} ${s.iconWrapAbout}`}>
                <Icon name="Settings" size="sm" />
              </div>
              <span className={s.navLabel}>Admin</span>
            </button>
          )}
        </div>

        {/* Footer - Flex item at bottom */}
        <div className={s.panelFooter}>
          <p className={s.versionText}>v{__APP_VERSION__} &bull; Epstein Archive</p>
        </div>
      </div>
    </div>
  );
};

export default MobileMenu;

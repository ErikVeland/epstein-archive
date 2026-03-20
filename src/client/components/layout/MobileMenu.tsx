import React, { useState, useEffect } from 'react';
import Icon from '../common/Icon';
import { CloseButton } from '../common/CloseButton';
import { useAuth } from '../../contexts/AuthContext';

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

  // Lock body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

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
    <div
      className={`mobile-nav md:hidden fixed inset-0 z-[60] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      {/* Backdrop overlay - closes menu when clicked */}
      <div
        aria-label="Close menu overlay"
        className="absolute inset-0 top-[60px] app-backdrop transition-all duration-300"
        onClick={onClose}
      />

      {/* Menu panel - on top of backdrop */}
      <div
        className={`absolute left-0 top-[60px] bottom-0 w-4/5 max-w-sm bg-[var(--bg-surface)] backdrop-blur-xl border-r border-[var(--glass-border)] shadow-[var(--glass-shadow)] transform transition-transform duration-300 ease-out z-10 flex flex-col ${open ? 'translate-x-0' : '-translate-x-full'}`}
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
        <div className="flex-none flex items-center justify-between p-4 border-b border-[var(--glass-border)] bg-[var(--glass-bg)]">
          <h3 className="text-[var(--text-primary)] font-semibold flex items-center gap-2">
            <Icon name="Menu" size="sm" className="text-[var(--accent)]" />
            Navigation
          </h3>
          <CloseButton
            onClick={onClose}
            size="sm"
            label="Close menu"
            className="bg-transparent hover:bg-[var(--glass-bg-strong)] text-[var(--text-secondary)]"
          />
        </div>

        {/* Mobile Search Input */}
        <div className="flex-none p-4 border-b border-[var(--glass-border)] bg-transparent">
          <div className="relative group">
            <input
              type="text"
              placeholder="Search people, documents..."
              className="w-full bg-[var(--glass-bg)] text-[var(--text-primary)] placeholder-[var(--text-muted)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] pl-10 pr-4 py-3 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none transition-all"
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
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-[var(--accent)] transition-colors">
              <Icon name="Search" size="xs" className="text-[var(--text-muted)]" />
            </div>
          </div>
        </div>

        {/* Scrollable Content Area - flex-1 takes remaining height */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1 min-h-0">
          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg-strong)] transition-colors group"
            onClick={() => handleNavigation('/')}
          >
            <div className="p-1.5 rounded-md bg-[var(--glass-bg)] group-hover:bg-[var(--glass-bg-strong)] transition-colors">
              <Icon
                name="Home"
                size="sm"
                className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
              />
            </div>
            <span className="font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
              Home
            </span>
          </button>

          <div className="px-3 py-2 mt-2 mb-1 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
            Explore
          </div>

          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg)]/80 active:bg-[var(--glass-bg-highlight)] transition-all duration-300 group hover:translate-x-1"
            onClick={() => handleNavigation('/people')}
          >
            <div className="p-1.5 rounded-md bg-[var(--glass-bg)] group-hover:bg-[var(--accent)]/20 shadow-[var(--glass-shadow-soft)] transition-colors">
              <Icon name="Users" size="sm" className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <span className="font-medium text-[var(--text-primary)] transition-colors">People</span>
          </button>
          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg)]/80 active:bg-[var(--glass-bg-highlight)] transition-all duration-300 group hover:translate-x-1"
            onClick={() => handleNavigation('/documents')}
          >
            <div className="p-1.5 rounded-md bg-[var(--glass-bg)] group-hover:bg-[var(--nav-documents-hover-bg)] shadow-[var(--glass-shadow-soft)] transition-colors">
              <Icon name="FileText" size="sm" className="w-4 h-4 text-[var(--nav-documents)]" />
            </div>
            <span className="font-medium text-[var(--text-primary)] transition-colors">
              Documents
            </span>
          </button>
          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg)]/80 active:bg-[var(--glass-bg-highlight)] transition-all duration-300 group hover:translate-x-1"
            onClick={() => handleNavigation('/emails')}
          >
            <div className="p-1.5 rounded-md bg-[var(--glass-bg)] group-hover:bg-[var(--nav-emails-hover-bg)] shadow-[var(--glass-shadow-soft)] transition-colors">
              <Icon name="Mail" size="sm" className="w-4 h-4 text-[var(--nav-emails)]" />
            </div>
            <span className="font-medium text-[var(--text-primary)] transition-colors">Emails</span>
          </button>
          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg)]/80 active:bg-[var(--glass-bg-highlight)] transition-all duration-300 group hover:translate-x-1"
            onClick={() => handleNavigation('/media')}
          >
            <div className="p-1.5 rounded-md bg-[var(--glass-bg)] group-hover:bg-[var(--nav-media-hover-bg)] shadow-[var(--glass-shadow-soft)] transition-colors">
              <Icon name="Newspaper" size="sm" className="w-4 h-4 text-[var(--nav-media)]" />
            </div>
            <span className="font-medium text-[var(--text-primary)] transition-colors">Media</span>
          </button>

          <div className="my-2 border-t border-[var(--glass-border)] mx-3"></div>
          <div className="px-3 py-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
            Intelligence
          </div>

          <button
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg)]/80 active:bg-[var(--glass-bg-highlight)] transition-all group ${attract ? 'ring-1 ring-[var(--nav-investigations-ring)] shadow-[var(--nav-investigations-glow)] bg-[var(--glass-bg)]/50' : ''}`}
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
            <div className="p-1.5 rounded-md bg-[var(--nav-investigations-bg)] group-hover:bg-[var(--nav-investigations-bg-hover)] transition-colors border border-[var(--nav-investigations-border)]">
              <Icon name="Target" size="sm" className="w-4 h-4 text-[var(--nav-investigations)]" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--text-primary)]">
                Investigations
              </span>
            </div>
          </button>
          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg)]/80 active:bg-[var(--glass-bg-highlight)] transition-colors group"
            onClick={() => handleNavigation('/blackbook')}
          >
            <div className="p-1.5 rounded-md bg-[var(--glass-bg)] group-hover:bg-[var(--glass-bg-highlight)] transition-colors border border-[var(--glass-border)]">
              <Icon name="Book" size="sm" className="w-4 h-4 text-[var(--text-secondary)]" />
            </div>
            <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--text-primary)]">
              Black Book
            </span>
          </button>
          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg)]/80 active:bg-[var(--glass-bg-highlight)] transition-colors group"
            onClick={() => handleNavigation('/timeline')}
          >
            <div className="p-1.5 rounded-md bg-[var(--nav-timeline-bg)] group-hover:bg-[var(--nav-timeline-bg-hover)] transition-colors border border-[var(--nav-timeline-border)]">
              <Icon name="Clock" size="sm" className="w-4 h-4 text-[var(--nav-timeline)]" />
            </div>
            <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--text-primary)]">
              Timeline
            </span>
          </button>
          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg)]/80 active:bg-[var(--glass-bg-highlight)] transition-colors group"
            onClick={() => handleNavigation('/flights')}
          >
            <div className="p-1.5 rounded-md bg-[var(--nav-flights-bg)] group-hover:bg-[var(--nav-flights-bg-hover)] transition-colors border border-[var(--nav-flights-border)]">
              <Icon name="Navigation" size="sm" className="w-4 h-4 text-[var(--nav-flights)]" />
            </div>
            <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--text-primary)]">
              Flights
            </span>
          </button>
          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg)]/80 active:bg-[var(--glass-bg-highlight)] transition-colors group"
            onClick={() => handleNavigation('/analytics')}
          >
            <div className="p-1.5 rounded-md bg-[var(--nav-analytics-bg)] group-hover:bg-[var(--nav-analytics-bg-hover)] transition-colors border border-[var(--nav-analytics-border)]">
              <Icon name="BarChart3" size="sm" className="w-4 h-4 text-[var(--nav-analytics)]" />
            </div>
            <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--text-primary)]">
              Analytics
            </span>
          </button>

          <div className="my-2 border-t border-[var(--glass-border)] mx-3"></div>

          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg)]/80 active:bg-[var(--glass-bg-highlight)] transition-colors group"
            onClick={() => handleNavigation('/about')}
          >
            <div className="p-1.5 rounded-md bg-[var(--glass-bg)]/50 group-hover:bg-[var(--glass-bg)] transition-colors">
              <Icon name="Shield" size="sm" className="w-4 h-4 text-[var(--text-muted)]" />
            </div>
            <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--text-primary)]">
              About
            </span>
          </button>

          {isAdmin && (
            <button
              className="w-full flex items-center gap-3 px-3 py-3 rounded-[var(--radius-lg)] text-[var(--text-primary)] hover:bg-[var(--glass-bg)]/80 active:bg-[var(--glass-bg-highlight)] transition-colors group"
              onClick={() => handleNavigation('/admin')}
            >
              <div className="p-1.5 rounded-md bg-[var(--glass-bg)]/50 group-hover:bg-[var(--glass-bg)] transition-colors">
                <Icon name="Settings" size="sm" className="w-4 h-4 text-[var(--text-muted)]" />
              </div>
              <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--text-primary)]">
                Admin
              </span>
            </button>
          )}
        </div>

        {/* Footer - Flex item at bottom */}
        <div className="flex-none p-4 border-t border-[var(--glass-border)] bg-[var(--glass-bg)] text-center">
          <p className="text-[10px] text-[var(--text-muted)]">
            v{__APP_VERSION__} • Epstein Archive
          </p>
        </div>
      </div>
    </div>
  );
};

export default MobileMenu;

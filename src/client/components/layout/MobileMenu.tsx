import React, { useState, useEffect } from 'react';
import Icon from '../common/Icon';
import { CloseButton } from '../common/CloseButton';
// @ts-ignore
import { useAuth } from '../../contexts/AuthContext';

interface MobileMenuProps {
  open: boolean;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onNavigate: (path: string) => void;
  onClose: () => void;
}

// TODO: Implement search in mobile menu - see UNUSED_VARIABLES_RECOMMENDATIONS.md
export const MobileMenu: React.FC<MobileMenuProps> = ({
  open,
  searchTerm,
  onSearchTermChange,
  onNavigate,
  onClose,
}) => {
  const [attract, setAttract] = useState<boolean>(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    const shown =
      typeof window !== 'undefined' && localStorage.getItem('investigate_attract_shown') === 'true';
    if (!shown) setAttract(true);
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
        className="absolute inset-0 top-[60px] bg-black/60 backdrop-blur-sm transition-all duration-300"
        onClick={onClose}
      />

      {/* Menu panel - on top of backdrop */}
      <div
        className={`absolute left-0 top-[60px] bottom-0 w-4/5 max-w-sm bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 shadow-2xl transform transition-transform duration-300 ease-out z-10 flex flex-col ${open ? 'translate-x-0' : '-translate-x-full'}`}
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside menu from closing it
        onTouchStart={(e) => {
          const touch = e.touches[0];
          const startX = touch.clientX;
          const handleTouchMove = (moveEvent: TouchEvent) => {
            const currentX = moveEvent.touches[0].clientX;
            const diff = startX - currentX;
            if (diff > 50) {
              // Swiped left
              onClose();
              window.removeEventListener('touchmove', handleTouchMove);
            }
          };
          window.addEventListener('touchmove', handleTouchMove, { once: true });
        }}
      >
        <div className="flex-none flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-900/90">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Icon name="Menu" size="sm" className="text-blue-500" />
            Navigation
          </h3>
          <CloseButton
            onClick={onClose}
            size="sm"
            label="Close menu"
            className="bg-transparent hover:bg-slate-800/80 active:bg-slate-700 border-slate-700 text-slate-400"
          />
        </div>

        {/* Mobile Search Input */}
        <div className="flex-none p-4 border-b border-slate-800/50 bg-slate-900/30">
          <div className="relative group">
            <input
              type="text"
              placeholder="Search subjects, docs..."
              className="w-full bg-slate-950/50 text-white placeholder-slate-500 border border-slate-700 rounded-lg pl-10 pr-4 py-3 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const query = searchTerm.trim();
                  if (query) {
                    handleNavigation(`/search?q=${encodeURIComponent(query)}`);
                  } else {
                    handleNavigation('/search');
                  }
                }
              }}
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-cyan-400 transition-colors">
              <Icon name="Search" size="xs" className="text-slate-500" />
            </div>
          </div>
        </div>

        {/* Scrollable Content Area - flex-1 takes remaining height */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1 min-h-0">
          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800/80 active:bg-slate-700 transition-colors group"
            onClick={() => handleNavigation('/')}
          >
            <div className="p-1.5 rounded-md bg-slate-800/50 group-hover:bg-slate-800 transition-colors">
              <Icon
                name="Home"
                size="sm"
                className="w-4 h-4 text-slate-400 group-hover:text-white"
              />
            </div>
            <span className="font-medium text-slate-200 group-hover:text-white">Home</span>
          </button>

          <div className="px-3 py-2 mt-2 mb-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Explore
          </div>

          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800/80 active:bg-slate-700 transition-colors group"
            onClick={() => handleNavigation('/people')}
          >
            <div className="p-1.5 rounded-md bg-blue-900/20 group-hover:bg-blue-900/40 transition-colors border border-blue-500/10">
              <Icon name="Users" size="sm" className="w-4 h-4 text-blue-400" />
            </div>
            <span className="font-medium text-slate-200 group-hover:text-white">Subjects</span>
          </button>
          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800/80 active:bg-slate-700 transition-colors group"
            onClick={() => handleNavigation('/documents')}
          >
            <div className="p-1.5 rounded-md bg-emerald-900/20 group-hover:bg-emerald-900/40 transition-colors border border-emerald-500/10">
              <Icon name="FileText" size="sm" className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="font-medium text-slate-200 group-hover:text-white">Documents</span>
          </button>
          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800/80 active:bg-slate-700 transition-colors group"
            onClick={() => handleNavigation('/emails')}
          >
            <div className="p-1.5 rounded-md bg-amber-900/20 group-hover:bg-amber-900/40 transition-colors border border-amber-500/10">
              <Icon name="Mail" size="sm" className="w-4 h-4 text-amber-400" />
            </div>
            <span className="font-medium text-slate-200 group-hover:text-white">Emails</span>
          </button>
          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800/80 active:bg-slate-700 transition-colors group"
            onClick={() => handleNavigation('/media')}
          >
            <div className="p-1.5 rounded-md bg-purple-900/20 group-hover:bg-purple-900/40 transition-colors border border-purple-500/10">
              <Icon name="Newspaper" size="sm" className="w-4 h-4 text-purple-400" />
            </div>
            <span className="font-medium text-slate-200 group-hover:text-white">Media</span>
          </button>

          <div className="my-2 border-t border-slate-800/80 mx-3"></div>
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Intelligence
          </div>

          <button
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800/80 active:bg-slate-700 transition-all group ${attract ? 'ring-1 ring-pink-500/50 shadow-[0_0_15px_-3px_rgba(236,72,153,0.3)] bg-slate-800/50' : ''}`}
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
            <div className="p-1.5 rounded-md bg-pink-900/20 group-hover:bg-pink-900/40 transition-colors border border-pink-500/10">
              <Icon name="Target" size="sm" className="w-4 h-4 text-pink-500" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-medium text-slate-200 group-hover:text-white">
                Investigations
              </span>
            </div>
          </button>
          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800/80 active:bg-slate-700 transition-colors group"
            onClick={() => handleNavigation('/blackbook')}
          >
            <div className="p-1.5 rounded-md bg-slate-800 group-hover:bg-slate-700 transition-colors border border-slate-600">
              <Icon name="Book" size="sm" className="w-4 h-4 text-slate-300" />
            </div>
            <span className="font-medium text-slate-200 group-hover:text-white">Black Book</span>
          </button>
          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800/80 active:bg-slate-700 transition-colors group"
            onClick={() => handleNavigation('/timeline')}
          >
            <div className="p-1.5 rounded-md bg-orange-900/20 group-hover:bg-orange-900/40 transition-colors border border-orange-500/10">
              <Icon name="Clock" size="sm" className="w-4 h-4 text-orange-400" />
            </div>
            <span className="font-medium text-slate-200 group-hover:text-white">Timeline</span>
          </button>
          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800/80 active:bg-slate-700 transition-colors group"
            onClick={() => handleNavigation('/flights')}
          >
            <div className="p-1.5 rounded-md bg-sky-900/20 group-hover:bg-sky-900/40 transition-colors border border-sky-500/10">
              <Icon name="Navigation" size="sm" className="w-4 h-4 text-sky-400" />
            </div>
            <span className="font-medium text-slate-200 group-hover:text-white">Flight Logs</span>
          </button>
          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800/80 active:bg-slate-700 transition-colors group"
            onClick={() => handleNavigation('/analytics')}
          >
            <div className="p-1.5 rounded-md bg-teal-900/20 group-hover:bg-teal-900/40 transition-colors border border-teal-500/10">
              <Icon name="BarChart3" size="sm" className="w-4 h-4 text-teal-400" />
            </div>
            <span className="font-medium text-slate-200 group-hover:text-white">Analytics</span>
          </button>

          <div className="my-2 border-t border-slate-800/80 mx-3"></div>

          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800/80 active:bg-slate-700 transition-colors group"
            onClick={() => handleNavigation('/about')}
          >
            <div className="p-1.5 rounded-md bg-slate-800/50 group-hover:bg-slate-800 transition-colors">
              <Icon name="Shield" size="sm" className="w-4 h-4 text-slate-400" />
            </div>
            <span className="font-medium text-slate-200 group-hover:text-white">About</span>
          </button>

          {isAdmin && (
            <button
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800/80 active:bg-slate-700 transition-colors group"
              onClick={() => handleNavigation('/admin')}
            >
              <div className="p-1.5 rounded-md bg-slate-800/50 group-hover:bg-slate-800 transition-colors">
                <Icon name="Settings" size="sm" className="w-4 h-4 text-slate-500" />
              </div>
              <span className="font-medium text-slate-200 group-hover:text-white">Admin</span>
            </button>
          )}
        </div>

        {/* Footer - Flex item at bottom */}
        <div className="flex-none p-4 border-t border-slate-800/50 bg-slate-900/95 text-center">
          <p className="text-[10px] text-slate-500">v{__APP_VERSION__} • Epstein Archive</p>
        </div>
      </div>
    </div>
  );
};

export default MobileMenu;

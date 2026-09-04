import { useLocation } from 'react-router-dom';
import { BottomNav, type BottomNavItem } from '@client/design-system/lib';

interface MobileBottomNavProps {
  className?: string;
}

const NAV_ITEMS: BottomNavItem[] = [
  { id: 'documents', label: 'Docs', icon: 'FileText', path: '/documents' },
  { id: 'people', label: 'People', icon: 'Users', path: '/people' },
  { id: 'search', label: 'Search', icon: 'Search', path: '' },
  { id: 'investigations', label: 'Investigate', icon: 'Target', path: '/investigations' },
  { id: 'more', label: 'More', icon: 'MoreHorizontal', path: '' },
];

export function MobileBottomNav({ className }: MobileBottomNavProps) {
  const location = useLocation();
  const isInvestigationWorkspace = /^\/investigations\/[^/]+/.test(location.pathname);
  const activeId = location.pathname.startsWith('/documents')
    ? 'documents'
    : location.pathname.startsWith('/evidence')
      ? 'documents'
      : location.pathname.startsWith('/people') || location.pathname.startsWith('/entity')
        ? 'people'
        : location.pathname.startsWith('/search')
          ? 'search'
          : location.pathname.startsWith('/investigations') ||
              location.pathname.startsWith('/investigate')
            ? 'investigations'
            : 'more';

  const handleNav = (item: BottomNavItem) => {
    if (item.id === 'more') {
      const event = new CustomEvent('toggleMobileMenu');
      window.dispatchEvent(event);
    } else if (item.id === 'search') {
      const event = new CustomEvent('toggleMobileSearch');
      window.dispatchEvent(event);
    }
  };

  if (isInvestigationWorkspace) return null;

  return (
    <BottomNav items={NAV_ITEMS} activeId={activeId} onAction={handleNav} className={className} />
  );
}

export default MobileBottomNav;

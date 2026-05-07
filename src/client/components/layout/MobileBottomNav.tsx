import { useLocation } from 'react-router-dom';
import { BottomNav, type BottomNavItem } from '@client/design-system/lib';

interface MobileBottomNavProps {
  className?: string;
}

const NAV_ITEMS: BottomNavItem[] = [
  { id: 'people', label: 'People', icon: 'Users', path: '/people' },
  { id: 'search', label: 'Search', icon: 'Search', path: '' },
  { id: 'investigations', label: 'Investigate', icon: 'Target', path: '/investigations' },
  { id: 'more', label: 'More', icon: 'MoreHorizontal', path: '' },
];

export function MobileBottomNav({ className }: MobileBottomNavProps) {
  const location = useLocation();

  const handleNav = (item: BottomNavItem) => {
    if (item.id === 'more') {
      const event = new CustomEvent('toggleMobileMenu');
      window.dispatchEvent(event);
    } else if (item.id === 'search') {
      const event = new CustomEvent('toggleMobileSearch');
      window.dispatchEvent(event);
    }
  };

  return (
    <BottomNav
      items={NAV_ITEMS}
      activeId={location.pathname === '/search' ? 'search' : undefined}
      onAction={handleNav}
      className={className}
    />
  );
}

export default MobileBottomNav;

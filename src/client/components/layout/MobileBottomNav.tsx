import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@client/design-system/lib';
import Icon, { type IconName } from '../common/Icon';
import styles from './MobileBottomNav.module.css';

interface MobileBottomNavProps {
  className?: string;
}

type NavTab = 'people' | 'search' | 'investigations' | 'more';

interface NavItem {
  id: NavTab;
  label: string;
  icon: IconName;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'people', label: 'People', icon: 'Users', path: '/people' },
  { id: 'search', label: 'Search', icon: 'Search', path: '' },
  { id: 'investigations', label: 'Investigate', icon: 'Target', path: '/investigations' },
  { id: 'more', label: 'More', icon: 'MoreHorizontal', path: '' },
];

export function MobileBottomNav({ className }: MobileBottomNavProps) {
  const location = useLocation();

  const handleNav = (item: NavItem) => {
    if (item.id === 'more') {
      const event = new CustomEvent('toggleMobileMenu');
      window.dispatchEvent(event);
    } else if (item.id === 'search') {
      const event = new CustomEvent('toggleMobileSearch');
      window.dispatchEvent(event);
    }
  };

  return (
    <nav className={cn(styles.nav, className)} role="navigation" aria-label="Main navigation">
      {NAV_ITEMS.map((item) =>
        item.path ? (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) => cn(styles.navItem, isActive && styles.active)}
          >
            <Icon name={item.icon} size="sm" className={styles.icon} />
            <span className={styles.label}>{item.label}</span>
          </NavLink>
        ) : (
          <button
            key={item.id}
            className={cn(
              styles.navItem,
              item.id === 'search' && location.pathname === '/search' && styles.active,
            )}
            onClick={() => handleNav(item)}
            type="button"
          >
            <Icon name={item.icon} size="sm" className={styles.icon} />
            <span className={styles.label}>{item.label}</span>
          </button>
        ),
      )}
    </nav>
  );
}

export default MobileBottomNav;

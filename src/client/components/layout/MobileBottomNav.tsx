import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../../design-system/lib';
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
  { id: 'search', label: 'Search', icon: 'Search', path: '/search' },
  { id: 'investigations', label: 'Investigate', icon: 'Target', path: '/investigations' },
  { id: 'more', label: 'More', icon: 'MoreHorizontal', path: '' },
];

export function MobileBottomNav({ className }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (!path) return false;
    return location.pathname.startsWith(path);
  };

  const handleNav = (item: NavItem) => {
    if (item.id === 'more') {
      const event = new CustomEvent('toggleMobileMenu');
      window.dispatchEvent(event);
      return;
    }
    navigate(item.path);
  };

  return (
    <nav className={cn(styles.nav, className)} role="navigation" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          className={cn(styles.navItem, isActive(item.path) && styles.active)}
          onClick={() => handleNav(item)}
          aria-current={isActive(item.path) ? 'page' : undefined}
          type="button"
        >
          <Icon name={item.icon} size="sm" className={styles.icon} />
          <span className={styles.label}>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default MobileBottomNav;

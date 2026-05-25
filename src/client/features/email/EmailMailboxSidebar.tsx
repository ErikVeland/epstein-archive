import React from 'react';
import styles from './EmailClient.module.css';
import Icon from '@client/components/common/Icon';

const STATIC_PEOPLE = [
  'Jeffrey Epstein',
  'Elon Musk',
  'Ghislaine Maxwell',
  'Ehud Barak',
  'Al Seckel',
  'Kimbal Musk',
  'Karyna Shuliak',
  'Deepak Chopra',
  'Ken Starr',
  'Peter Attia',
  'Jeremy Rubin',
  'Neri Oxman',
  'Marvin Minsky',
  'Lawrence Krauss',
  'Seth Lloyd',
  'Boris Nikolic',
  'Jean Luc Brunel',
  'Lesley Groff',
  'Sarah Kellen',
  'Nadia Marcinkova',
  'Darren Indyke',
  'Mark Epstein',
  'Emad Hanna',
  'Joscha Bach',
  'Rich Kahn',
  'Cecilia Steen',
  'John Amerling',
  'Sultan Bin Sulayem',
  'Matthew Hiltzik',
  'Peter Mandelson',
  'Howard Lutnick',
];

interface EmailMailboxSidebarProps {
  mobilePane: 'mailboxes' | 'threads' | 'messages';
  mailboxes: Array<{ mailboxId: string; displayName: string; isVip?: boolean }>;
  selectedMailboxId: string;
  topic: string;
  onTopicChange: (topic: string) => void;
  onPersonClick: (name: string) => void;
}

export const EmailMailboxSidebar: React.FC<EmailMailboxSidebarProps> = ({
  mobilePane,
  topic,
  onTopicChange,
  onPersonClick,
}) => {
  return (
    <aside
      className={`${styles.mailboxPane} ${
        mobilePane === 'mailboxes' ? styles.mobilePaneVisible : styles.mobilePaneHidden
      }`}
    >
      <div className={styles.sidebarCompose} style={{ height: '20px' }}>
        {/* Compose artifact retired - read only context */}
      </div>

      <div className={styles.sidebarSection}>
        <div className={`${styles.sidebarItem} ${styles.sidebarItemActive}`}>
          <Icon name="Inbox" />
          <span>Inbox</span>
          <span className={styles.sidebarItemCount}>13k</span>
        </div>
        <div className={styles.sidebarItem}>
          <Icon name="Star" />
          <span>Starred</span>
        </div>
        <div className={styles.sidebarItem}>
          <Icon name="AlertOctagon" />
          <span>Unredaction Requests</span>
        </div>
        <div className={styles.sidebarItem}>
          <Icon name="Send" />
          <span>Sent</span>
        </div>
        <div className={styles.sidebarItem}>
          <Icon name="Paperclip" />
          <span>Attachments</span>
        </div>
        <div className={styles.sidebarItem}>
          <Icon name="History" />
          <span>Daily Activity</span>
        </div>
      </div>

      <div className={styles.sidebarSection}>
        <div className={styles.sidebarSectionHeader}>
          <span>TOPICS</span>
          <Icon name="ChevronDown" />
        </div>
        <div
          className={`${styles.sidebarItem} ${topic === 'asking for advice' ? styles.sidebarItemActive : ''}`}
          onClick={() => onTopicChange('asking for advice')}
        >
          <Icon name="MessageSquare" />
          <span>Asking for advice</span>
        </div>
        <div
          className={`${styles.sidebarItem} ${topic === 'introductions' ? styles.sidebarItemActive : ''}`}
          onClick={() => onTopicChange('introductions')}
        >
          <Icon name="Users" />
          <span>Introductions</span>
        </div>
        <div
          className={`${styles.sidebarItem} ${topic === 'damage control' ? styles.sidebarItemActive : ''}`}
          onClick={() => onTopicChange('damage control')}
        >
          <Icon name="ShieldAlert" />
          <span>Damage control</span>
        </div>
        <div
          className={`${styles.sidebarItem} ${topic === 'financial discussions' ? styles.sidebarItemActive : ''}`}
          onClick={() => onTopicChange('financial discussions')}
        >
          <Icon name="DollarSign" />
          <span>Financial discussions</span>
        </div>
        <div
          className={`${styles.sidebarItem} ${topic === 'travel plans' ? styles.sidebarItemActive : ''}`}
          onClick={() => onTopicChange('travel plans')}
        >
          <Icon name="Plane" />
          <span>Travel plans</span>
        </div>
      </div>

      <div className={styles.sidebarSection}>
        <div className={styles.sidebarSectionHeader}>
          <span>PEOPLE</span>
          <Icon name="ChevronDown" />
        </div>
        <div className={styles.sidebarItem}>
          <Icon name="BookOpen" />
          <span>Browse all people</span>
        </div>
        <div className={styles.scrollListWrapper} style={{ overflowY: 'auto', maxHeight: '40vh' }}>
          {STATIC_PEOPLE.map((person) => (
            <div
              key={person}
              className={styles.sidebarItem}
              style={person === 'Jeffrey Epstein' ? { fontWeight: 600, opacity: 0.9 } : {}}
              onClick={() => onPersonClick(person)}
            >
              <span>{person}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

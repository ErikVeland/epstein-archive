import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Phone, Mail, MapPin, User, Book, Eye, FileText, ExternalLink } from 'lucide-react';
import { extractCleanName, formatPhoneNumber } from '../utils/prettifyOCR';
import { Link } from 'react-router-dom';
import { AddToInvestigationButton } from './common/AddToInvestigationButton';
import { useNavigate } from 'react-router-dom';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from './common/AutoSizer';
import styles from './BlackBookViewer.module.css';
import { Button, Input, SearchField, Surface } from '../design-system/lib';
interface BlackBookEntry {
  id: number;
  person_id: number | null;
  entry_text: string;
  phone_numbers: string[];
  addresses: string[];
  email_addresses: string[];
  notes: string;
  entry_category: 'original' | 'contact' | 'credential';
  document_id?: number;
  person_name?: string;
  thumbnail_path?: string;
}

const parseStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    if (!value.trim()) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.map((entry) => String(entry || '').trim()).filter(Boolean)
        : [value];
    } catch {
      return [value];
    }
  }
  return [];
};

export const BlackBookViewer: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string>('ALL');
  const [hasPhone, setHasPhone] = useState<boolean>(false);
  const [hasEmail, setHasEmail] = useState<boolean>(false);
  const [hasAddress, setHasAddress] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showRaw, setShowRaw] = useState<boolean>(false);
  const navigate = useNavigate();

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const {
    data: entries = [],
    isLoading,
    isError,
    error: queryError,
    refetch,
  } = useQuery<BlackBookEntry[]>({
    queryKey: [
      'black-book',
      searchTerm,
      selectedLetter,
      hasPhone,
      hasEmail,
      hasAddress,
      selectedCategory,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (selectedLetter && selectedLetter !== 'ALL') params.set('letter', selectedLetter);
      if (hasPhone) params.set('hasPhone', 'true');
      if (hasEmail) params.set('hasEmail', 'true');
      if (hasAddress) params.set('hasAddress', 'true');
      if (selectedCategory !== 'ALL') params.set('category', selectedCategory.toLowerCase());
      params.set('limit', '5000');

      const response = await fetch(`/api/black-book?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Black Book API request failed (${response.status})`);
      }
      const result = await response.json();

      const data = result.data || [];

      return data.map((entry: Record<string, unknown>): BlackBookEntry => {
        const rawPhones = entry.phone_numbers ?? entry.phoneNumbers;
        const rawAddresses = entry.addresses;
        const rawEmails = entry.email_addresses ?? entry.emailAddresses;

        return {
          id: Number(entry.id),
          person_id:
            entry.person_id != null
              ? Number(entry.person_id)
              : entry.personId != null
                ? Number(entry.personId)
                : null,
          entry_text: String(entry.entry_text ?? entry.entryText ?? ''),
          phone_numbers: parseStringList(rawPhones),
          addresses: parseStringList(rawAddresses),
          email_addresses: parseStringList(rawEmails),
          notes: String(entry.notes ?? ''),
          entry_category: String(entry.entry_category ?? entry.entryCategory ?? 'original') as
            | 'original'
            | 'contact'
            | 'credential',
          document_id:
            entry.document_id != null
              ? Number(entry.document_id)
              : entry.documentId != null
                ? Number(entry.documentId)
                : undefined,
          person_name:
            typeof entry.person_name === 'string'
              ? entry.person_name
              : typeof entry.displayName === 'string'
                ? entry.displayName
                : undefined,
          thumbnail_path:
            typeof entry.thumbnail_path === 'string'
              ? entry.thumbnail_path
              : typeof entry.thumbnailPath === 'string'
                ? entry.thumbnailPath
                : undefined,
        };
      });
    },
  });

  const filteredEntries = entries;
  const error = isError
    ? queryError instanceof Error
      ? queryError.message
      : 'Failed to load Black Book entries'
    : null;
  const fetchBlackBookEntries = refetch;

  const extractName = useCallback((entryText?: string | null): string => {
    const lines = String(entryText || '').split('\n');
    return lines[0]?.trim() || 'Unknown';
  }, []);

  const handleEntityClick = useCallback(
    (personId: number) => {
      if (!personId) return;
      navigate(`/entity/${personId}`);
    },
    [navigate],
  );

  const getCategoryBadgeClass = (category: BlackBookEntry['entry_category']) => {
    switch (category) {
      case 'credential':
        return styles.badgeCredential;
      case 'contact':
        return styles.badgeContact;
      default:
        return styles.badgeOriginal;
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <Book className={styles.heroIcon} />
          <div>
            <h2 className={styles.title}>Jeffrey Epstein's Black Book</h2>
            <p className={styles.subtitle}>
              {filteredEntries.length} of {entries.length} contacts
            </p>
          </div>
        </div>

        {/* Pretty/Raw Toggle */}
        <Button
          onClick={() => setShowRaw(!showRaw)}
          variant={showRaw ? 'secondary' : 'primary'}
          size="sm"
          className={styles.toggleButton}
          title={showRaw ? 'Showing raw OCR text' : 'Showing cleaned text'}
        >
          {showRaw ? <FileText className={styles.smIcon} /> : <Eye className={styles.smIcon} />}
          <span className={styles.toggleText}>{showRaw ? 'Raw OCR' : 'Pretty'}</span>
        </Button>
      </div>

      {/* Search Bar */}
      <div className={styles.searchWrap}>
        <SearchField
          density="comfortable"
          placeholder="Search by name, phone, email, or address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          rootClassName={styles.searchFieldRoot}
        />
      </div>

      {/* Alphabet Filter */}
      <div className={styles.letters}>
        <Button
          onClick={() => setSelectedLetter('ALL')}
          variant={selectedLetter === 'ALL' ? 'primary' : 'secondary'}
          size="sm"
        >
          ALL
        </Button>
        {alphabet.map((letter) => (
          <Button
            key={letter}
            onClick={() => setSelectedLetter(letter)}
            variant={selectedLetter === letter ? 'primary' : 'secondary'}
            size="sm"
          >
            {letter}
          </Button>
        ))}
      </div>

      {/* Contact Filters */}
      <div className={styles.filtersRow}>
        <label className={styles.checkLabel}>
          <Input
            type="checkbox"
            checked={hasPhone}
            onChange={(e) => setHasPhone(e.target.checked)}
          />
          <span>Has Phone</span>
          <Phone className={styles.smIcon} />
        </label>
        <label className={styles.checkLabel}>
          <Input
            type="checkbox"
            checked={hasEmail}
            onChange={(e) => setHasEmail(e.target.checked)}
          />
          <span>Has Email</span>
          <Mail className={styles.smIcon} />
        </label>
        <label className={styles.checkLabel}>
          <Input
            type="checkbox"
            checked={hasAddress}
            onChange={(e) => setHasAddress(e.target.checked)}
          />
          <span>Has Address</span>
          <MapPin className={styles.smIcon} />
        </label>

        <div className={styles.divider} />

        <Surface variant="glass" className={styles.categoryBar} p={1}>
          {['ALL', 'Original', 'Contact', 'Credential'].map((cat) => (
            <Button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              variant={selectedCategory === cat ? 'primary' : 'ghost'}
              size="sm"
            >
              {cat}
            </Button>
          ))}
        </Surface>
      </div>

      {/* Entries Grid - Virtualized */}
      <div className={styles.listShell}>
        {filteredEntries.length > 0 && (
          <AutoSizer>
            {({ height, width }: { height: number; width: number }) => {
              const safeHeight = height ?? 600;
              const safeWidth = width ?? 0;
              const columns = safeWidth >= 1024 ? 3 : safeWidth >= 768 ? 2 : 1;
              const rowCount = Math.ceil(filteredEntries.length / columns);

              return (
                <List
                  height={safeHeight}
                  itemCount={rowCount}
                  itemSize={220}
                  width={safeWidth || '100%'}
                  className={styles.virtualList}
                >
                  {({ index, style }) => {
                    const rowItems = filteredEntries.slice(index * columns, (index + 1) * columns);

                    return (
                      <div style={style} className={styles.row}>
                        {rowItems.map((entry) => {
                          const rawName = entry.person_name || extractName(entry.entry_text);
                          const displayName = showRaw
                            ? rawName
                            : extractCleanName(entry.entry_text) || rawName;

                          return (
                            <Surface
                              key={entry.id}
                              style={{
                                width: `calc(${100 / columns}% - ${((columns - 1) * 16) / columns}px)`,
                              }}
                              className={styles.card}
                              variant="glass"
                              p={4}
                            >
                              {/* Name - clickable if known entity */}
                              <div className={styles.cardHeader}>
                                {entry.thumbnail_path ? (
                                  <div className={styles.avatar}>
                                    <img
                                      src={
                                        entry.thumbnail_path.startsWith('/')
                                          ? entry.thumbnail_path
                                          : `/${entry.thumbnail_path}`
                                      }
                                      alt={displayName}
                                      className={styles.avatarImg}
                                      loading="lazy"
                                    />
                                  </div>
                                ) : (
                                  <div className={styles.fallbackAvatar}>
                                    <User className={styles.fallbackIcon} />
                                  </div>
                                )}
                                <div className={styles.nameWrap}>
                                  {entry.person_name ? (
                                    <Button
                                      onClick={() => handleEntityClick(entry.person_id || 0)}
                                      variant="ghost"
                                      className={styles.entityButton}
                                      title="Click to view entity profile"
                                    >
                                      <span className={styles.textClamp}>{displayName}</span>
                                      <ExternalLink className={styles.tinyExternal} />
                                    </Button>
                                  ) : (
                                    <h3 className={`${styles.plainName} ${styles.textClamp}`}>
                                      {displayName}
                                    </h3>
                                  )}
                                </div>
                                <div className={styles.headerActions}>
                                  <AddToInvestigationButton
                                    item={{
                                      id: `blackbook-${entry.id}`,
                                      title: `Black Book: ${displayName}`,
                                      description: `Contact entry for ${displayName}`,
                                      type: 'entity',
                                      sourceId: String(entry.id),
                                      metadata: {
                                        entryText: entry.entry_text,
                                        phones: entry.phone_numbers,
                                        emails: entry.email_addresses,
                                      },
                                    }}
                                    variant="icon"
                                    className={styles.addButton}
                                  />
                                </div>
                              </div>

                              {/* Contact Info */}
                              <div className={styles.contactSection}>
                                {/* Phone Numbers */}
                                {entry.phone_numbers.length > 0 && (
                                  <div className={styles.infoRow}>
                                    <Phone className={styles.infoIcon} />
                                    <div className={styles.infoBody}>
                                      {entry.phone_numbers.map((phone, idx) => (
                                        <div key={idx} className={styles.infoText}>
                                          {showRaw ? phone : formatPhoneNumber(phone)}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Emails */}
                                {entry.email_addresses.length > 0 && (
                                  <div className={styles.infoRow}>
                                    <Mail className={styles.infoIcon} />
                                    <div className={styles.infoBody}>
                                      {entry.email_addresses.map((email, idx) => (
                                        <div key={idx} className={styles.emailRow}>
                                          <Link
                                            to={`/emails?search=${encodeURIComponent(email)}`}
                                            className={styles.emailLink}
                                          >
                                            {email}
                                          </Link>
                                          <Link
                                            to={`/emails?search=${encodeURIComponent(email)}`}
                                            className={styles.emailActions}
                                          >
                                            <ExternalLink className={styles.tinyExternal} />
                                          </Link>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Addresses */}
                                {entry.addresses.length > 0 && (
                                  <div className={styles.infoRow}>
                                    <MapPin className={styles.infoIcon} />
                                    <div className={styles.infoBody}>
                                      {entry.addresses.slice(0, 2).map((address, idx) => (
                                        <div key={idx} className={styles.infoText}>
                                          {address}
                                        </div>
                                      ))}
                                      {entry.addresses.length > 2 && (
                                        <div className={styles.subtleCount}>
                                          +{entry.addresses.length - 2} more
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* No contact info */}
                                {entry.phone_numbers.length === 0 &&
                                  entry.email_addresses.length === 0 &&
                                  entry.addresses.length === 0 && (
                                    <div className={styles.emptyInfo}>
                                      No contact information available
                                    </div>
                                  )}
                              </div>

                              {/* Metadata & Categories */}
                              <div className={styles.cardFooter}>
                                <span
                                  className={`${styles.categoryBadge} ${getCategoryBadgeClass(entry.entry_category)}`}
                                >
                                  {entry.entry_category}
                                </span>

                                {entry.document_id && (
                                  <Link
                                    to={`/documents/${entry.document_id}`}
                                    className={styles.documentLink}
                                  >
                                    <FileText className={styles.tinyExternal} />
                                    Source Document
                                  </Link>
                                )}
                              </div>
                            </Surface>
                          );
                        })}
                      </div>
                    );
                  }}
                </List>
              );
            }}
          </AutoSizer>
        )}
      </div>

      {/* Empty State */}
      {filteredEntries.length === 0 && (
        <div className={styles.emptyState}>
          <Book className={styles.emptyIcon} />
          <p className={`${styles.emptyMessage} ${error ? styles.errorText : styles.mutedText}`}>
            {error ? 'Failed to load contacts' : 'No contacts found'}
          </p>
          <p className={styles.emptyHint}>{error || 'Try adjusting your search or filter'}</p>
          {error && (
            <Button onClick={() => void fetchBlackBookEntries()} variant="secondary">
              Retry
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

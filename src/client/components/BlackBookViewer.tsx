import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import Icon from '@client/components/common/Icon';
import { extractCleanName, formatPhoneNumber } from '@client/utils/prettifyOCR';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AddToInvestigationButton } from './common/AddToInvestigationButton';
import { useBackLinkState } from '@client/hooks/useReliableBackNavigation';
import { useModalFocusTrap } from '@client/hooks/useModalFocusTrap';
import { useScrollLock } from '@client/hooks/useScrollLock';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from './common/AutoSizer';
import styles from './BlackBookViewer.module.css';
import { Button, Input, SearchField, Surface } from '@client/design-system/lib';
import { AnimatedSegmentedControl } from './common/AnimatedSegmentedControl';
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

type BlackBookCategoryFilter = 'ALL' | 'Original' | 'Contact' | 'Credential';
type BlackBookTextMode = 'pretty' | 'raw';

const CATEGORY_OPTIONS: Array<{ value: BlackBookCategoryFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'Original', label: 'Address Book' },
];

const TEXT_MODE_OPTIONS: Array<{
  value: BlackBookTextMode;
  label: string;
  icon: 'Eye' | 'FileText';
}> = [
  { value: 'pretty', label: 'Pretty', icon: 'Eye' },
  { value: 'raw', label: 'Raw OCR', icon: 'FileText' },
];

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

const getRecordTypeLabel = (category: BlackBookEntry['entry_category']) => {
  switch (category) {
    case 'credential':
      return 'Possible credential';
    case 'contact':
      return 'Extracted contact';
    default:
      return 'Address book';
  }
};

export const BlackBookViewer: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || '');
  const [selectedLetter, setSelectedLetter] = useState<string>('ALL');
  const [hasPhone, setHasPhone] = useState<boolean>(false);
  const [hasEmail, setHasEmail] = useState<boolean>(false);
  const [hasAddress, setHasAddress] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<BlackBookCategoryFilter>('ALL');
  const [selectedEntry, setSelectedEntry] = useState<BlackBookEntry | null>(null);

  React.useEffect(() => {
    const q = searchParams.get('search') || '';
    setSearchTerm(q);
  }, [searchParams]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    const newParams = new URLSearchParams(searchParams);
    if (value.trim()) {
      newParams.set('search', value);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams, { replace: true });
  };
  const [showRaw, setShowRaw] = useState<boolean>(false);
  const navigate = useNavigate();

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const letterOptions = ['ALL', ...alphabet].map((letter) => ({ value: letter, label: letter }));

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
  const backLinkState = useBackLinkState();

  const extractName = useCallback((entryText?: string | null): string => {
    const lines = String(entryText || '').split('\n');
    return lines[0]?.trim() || 'Unknown';
  }, []);

  const handleEntityClick = useCallback(
    (personId: number) => {
      if (!personId) return;
      navigate(`/entity/${personId}`, { state: backLinkState });
    },
    [backLinkState, navigate],
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
          <Icon name="Book" className={styles.heroIcon} />
          <div>
            <h2 className={styles.title}>Jeffrey Epstein's Black Book</h2>
            <p className={styles.subtitle}>
              {filteredEntries.length} of {entries.length} contacts
            </p>
          </div>
        </div>

        <AnimatedSegmentedControl
          ariaLabel="Black Book text mode"
          options={TEXT_MODE_OPTIONS}
          value={showRaw ? 'raw' : 'pretty'}
          onChange={(mode) => setShowRaw(mode === 'raw')}
          minItemWidth="6rem"
          compact
          className={styles.textModeToggle}
        />
      </div>

      {/* Search Bar */}
      <div className={styles.searchWrap}>
        <SearchField
          density="comfortable"
          placeholder="Search by name, phone, email, or address..."
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          rootClassName={styles.searchFieldRoot}
        />
      </div>

      {/* Alphabet Filter */}
      <div className={styles.letters}>
        <AnimatedSegmentedControl
          ariaLabel="Filter Black Book entries by surname initial"
          options={letterOptions}
          value={selectedLetter}
          onChange={setSelectedLetter}
          minItemWidth="0"
          fullWidth
          compact
          className={styles.letterSegment}
        />
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
          <Icon name="Phone" className={styles.smIcon} />
        </label>
        <label className={styles.checkLabel}>
          <Input
            type="checkbox"
            checked={hasEmail}
            onChange={(e) => setHasEmail(e.target.checked)}
          />
          <span>Has Email</span>
          <Icon name="Mail" className={styles.smIcon} />
        </label>
        <label className={styles.checkLabel}>
          <Input
            type="checkbox"
            checked={hasAddress}
            onChange={(e) => setHasAddress(e.target.checked)}
          />
          <span>Has Address</span>
          <Icon name="MapPin" className={styles.smIcon} />
        </label>

        <div className={styles.divider} />

        <AnimatedSegmentedControl
          ariaLabel="Filter Black Book entries by record type"
          options={CATEGORY_OPTIONS}
          value={selectedCategory}
          onChange={setSelectedCategory}
          minItemWidth="0"
          fullWidth
          className={styles.categoryBar}
        />
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
                          const visiblePhones = entry.phone_numbers.slice(0, 2);
                          const visibleEmails = entry.email_addresses.slice(0, 1);
                          const visibleAddresses = entry.addresses.slice(0, 1);
                          const hiddenDetailCount =
                            Math.max(0, entry.phone_numbers.length - visiblePhones.length) +
                            Math.max(0, entry.email_addresses.length - visibleEmails.length) +
                            Math.max(0, entry.addresses.length - visibleAddresses.length);

                          return (
                            <Surface
                              key={entry.id}
                              style={{
                                width: `calc(${100 / columns}% - ${((columns - 1) * 16) / columns}px)`,
                              }}
                              className={`${styles.card} ${styles.clickableCard}`}
                              variant="glass"
                              p={4}
                              onClick={() => setSelectedEntry(entry)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  setSelectedEntry(entry);
                                }
                              }}
                              role="button"
                              tabIndex={0}
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
                                    <Icon name="User" className={styles.fallbackIcon} />
                                  </div>
                                )}
                                <div className={styles.nameWrap}>
                                  {entry.person_name ? (
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEntityClick(entry.person_id || 0);
                                      }}
                                      variant="ghost"
                                      className={styles.entityButton}
                                      title="Click to view entity profile"
                                    >
                                      <span className={styles.textClamp}>{displayName}</span>
                                      <Icon name="ExternalLink" className={styles.tinyExternal} />
                                    </Button>
                                  ) : (
                                    <>
                                      <h3 className={`${styles.plainName} ${styles.textClamp}`}>
                                        {displayName}
                                      </h3>
                                      <Link
                                        to={`/documents?search=${encodeURIComponent(displayName)}`}
                                        state={backLinkState}
                                        onClick={(e) => e.stopPropagation()}
                                        className={styles.searchEvidenceLink}
                                        title="Search evidence for this name"
                                      >
                                        <Icon name="Search" className={styles.tinyExternal} />
                                        Search Evidence
                                      </Link>
                                    </>
                                  )}
                                </div>
                                <div
                                  className={styles.headerActions}
                                  onClick={(e) => e.stopPropagation()}
                                >
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
                                    <Icon name="Phone" className={styles.infoIcon} />
                                    <div className={styles.infoBody}>
                                      {visiblePhones.map((phone, idx) => (
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
                                    <Icon name="Mail" className={styles.infoIcon} />
                                    <div className={styles.infoBody}>
                                      {visibleEmails.map((email, idx) => (
                                        <div key={idx} className={styles.emailRow}>
                                          <Link
                                            to={`/emails?search=${encodeURIComponent(email)}`}
                                            state={backLinkState}
                                            onClick={(e) => e.stopPropagation()}
                                            className={styles.emailLink}
                                          >
                                            {email}
                                          </Link>
                                          <Link
                                            to={`/emails?search=${encodeURIComponent(email)}`}
                                            state={backLinkState}
                                            onClick={(e) => e.stopPropagation()}
                                            className={styles.emailActions}
                                          >
                                            <Icon
                                              name="ExternalLink"
                                              className={styles.tinyExternal}
                                            />
                                          </Link>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Addresses */}
                                {entry.addresses.length > 0 && (
                                  <div className={styles.infoRow}>
                                    <Icon name="MapPin" className={styles.infoIcon} />
                                    <div className={styles.infoBody}>
                                      {visibleAddresses.map((address, idx) => (
                                        <div key={idx} className={styles.infoText}>
                                          {address}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* No contact info */}
                                {entry.phone_numbers.length === 0 &&
                                  entry.email_addresses.length === 0 &&
                                  entry.addresses.length === 0 && (
                                    <div className={styles.emptyInfo}>OCR text only</div>
                                  )}
                                <div className={styles.openHint}>
                                  <Icon name="Maximize2" className={styles.tinyExternal} />
                                  <span>
                                    Open full card
                                    {hiddenDetailCount > 0 ? `, ${hiddenDetailCount} more` : ''}
                                  </span>
                                </div>
                              </div>

                              {/* Metadata & Categories */}
                              <div className={styles.cardFooter}>
                                <span
                                  className={`${styles.categoryBadge} ${getCategoryBadgeClass(entry.entry_category)}`}
                                >
                                  {getRecordTypeLabel(entry.entry_category)}
                                </span>

                                {entry.document_id && (
                                  <Link
                                    to={`/documents/${encodeURIComponent(String(entry.document_id))}`}
                                    state={backLinkState}
                                    onClick={(e) => e.stopPropagation()}
                                    className={styles.documentLink}
                                  >
                                    <Icon name="FileText" className={styles.tinyExternal} />
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
          <Icon name="Book" className={styles.emptyIcon} />
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

      {selectedEntry && (
        <ContactDetailsModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          showRawMode={showRaw}
        />
      )}
    </div>
  );
};

interface ContactDetailsModalProps {
  entry: BlackBookEntry;
  onClose: () => void;
  showRawMode: boolean;
}

const ContactDetailsModal: React.FC<ContactDetailsModalProps> = ({
  entry,
  onClose,
  showRawMode,
}) => {
  const { modalRef } = useModalFocusTrap({ isActive: true, onEscape: onClose });
  useScrollLock(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [localShowRaw, setLocalShowRaw] = useState(showRawMode);
  const backLinkState = useBackLinkState();
  const navigate = useNavigate();

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  const rawName = entry.person_name || entry.entry_text.split('\n')[0]?.trim() || 'Unknown';
  const cleanName = extractCleanName(entry.entry_text) || rawName;
  const displayName = localShowRaw ? rawName : cleanName;

  const handleEntityClick = (personId: number) => {
    onClose();
    navigate(`/entity/${personId}`, { state: backLinkState });
  };

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

  return createPortal(
    <div className={styles.backdrop}>
      <button className={styles.dismissLayer} onClick={onClose} aria-label="Close details modal" />
      <div
        ref={modalRef}
        className={styles.modalDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-contact-name"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          {entry.thumbnail_path ? (
            <div className={styles.modalAvatar}>
              <img
                src={
                  entry.thumbnail_path.startsWith('/')
                    ? entry.thumbnail_path
                    : `/${entry.thumbnail_path}`
                }
                alt={displayName}
                className={styles.avatarImg}
              />
            </div>
          ) : (
            <div className={styles.modalFallbackAvatar}>
              <Icon name="User" className={styles.modalLargeIcon} />
            </div>
          )}
          <div className={styles.modalNameGroup}>
            <h3 id="modal-contact-name" className={styles.modalName}>
              {displayName}
            </h3>
            <span
              className={`${styles.categoryBadge} ${getCategoryBadgeClass(entry.entry_category)}`}
            >
              {getRecordTypeLabel(entry.entry_category)}
            </span>
          </div>
          <Button
            variant="glass"
            size="sm"
            onClick={onClose}
            className={styles.modalCloseButton}
            title="Close details modal"
          >
            <Icon name="X" size="sm" />
          </Button>
        </div>

        <div className={styles.modalBody}>
          {/* Phone Numbers */}
          {entry.phone_numbers.length > 0 && (
            <div className={styles.detailSection}>
              <div className={styles.detailSectionLabel}>
                <Icon name="Phone" className={styles.detailSectionIcon} />
                <span>Phone Numbers</span>
              </div>
              <div className={styles.detailGrid}>
                {entry.phone_numbers.map((phone, idx) => {
                  const formatted = formatPhoneNumber(phone);
                  const displayPhone = localShowRaw ? phone : formatted;
                  const isCopied = copiedField === `phone-${idx}`;
                  return (
                    <div key={idx} className={styles.detailCard}>
                      <span className={styles.detailCardValue}>{displayPhone}</span>
                      <div className={styles.detailActions}>
                        <a
                          href={`tel:${phone}`}
                          className={styles.detailCardAction}
                          title="Call phone number"
                        >
                          <Icon name="PhoneCall" size="sm" />
                        </a>
                        <button
                          type="button"
                          className={styles.detailCardAction}
                          onClick={() => handleCopy(displayPhone, `phone-${idx}`)}
                          title="Copy phone number"
                        >
                          <Icon
                            name={isCopied ? 'Check' : 'Copy'}
                            size="sm"
                            style={isCopied ? { color: '#4ade80' } : undefined}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Email Addresses */}
          {entry.email_addresses.length > 0 && (
            <div className={styles.detailSection}>
              <div className={styles.detailSectionLabel}>
                <Icon name="Mail" className={styles.detailSectionIcon} />
                <span>Email Addresses</span>
              </div>
              <div className={styles.detailGrid}>
                {entry.email_addresses.map((email, idx) => {
                  const isCopied = copiedField === `email-${idx}`;
                  return (
                    <div key={idx} className={styles.detailCard}>
                      <span className={styles.detailCardValue}>{email}</span>
                      <div className={styles.detailActions}>
                        <a
                          href={`mailto:${email}`}
                          className={styles.detailCardAction}
                          title="Send email"
                        >
                          <Icon name="Mail" size="sm" />
                        </a>
                        <button
                          type="button"
                          className={styles.detailCardAction}
                          onClick={() => handleCopy(email, `email-${idx}`)}
                          title="Copy email address"
                        >
                          <Icon
                            name={isCopied ? 'Check' : 'Copy'}
                            size="sm"
                            style={isCopied ? { color: '#4ade80' } : undefined}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Physical Addresses */}
          {entry.addresses.length > 0 && (
            <div className={styles.detailSection}>
              <div className={styles.detailSectionLabel}>
                <Icon name="MapPin" className={styles.detailSectionIcon} />
                <span>Physical Addresses</span>
              </div>
              <div className={styles.detailGrid}>
                {entry.addresses.map((address, idx) => {
                  const isCopied = copiedField === `address-${idx}`;
                  return (
                    <div key={idx} className={styles.detailCard}>
                      <span className={styles.detailCardValue}>{address}</span>
                      <button
                        type="button"
                        className={styles.detailCardAction}
                        onClick={() => handleCopy(address, `address-${idx}`)}
                        title="Copy address"
                      >
                        <Icon
                          name={isCopied ? 'Check' : 'Copy'}
                          size="sm"
                          style={isCopied ? { color: '#4ade80' } : undefined}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes (if present) */}
          {entry.notes && entry.notes.trim() && (
            <div className={styles.detailSection}>
              <div className={styles.detailSectionLabel}>
                <Icon name="Info" className={styles.detailSectionIcon} />
                <span>Academic Notes</span>
              </div>
              <div className={styles.notesBlock}>{entry.notes}</div>
            </div>
          )}

          {/* OCR / Pretty Comparison */}
          <div className={styles.detailSection}>
            <div className={styles.ocrToggleBlock}>
              <div className={styles.ocrHeader}>
                <span className={styles.ocrTitle}>OCR Transcription View</span>
                <AnimatedSegmentedControl
                  ariaLabel="Transcription view mode"
                  options={TEXT_MODE_OPTIONS}
                  value={localShowRaw ? 'raw' : 'pretty'}
                  onChange={(mode) => setLocalShowRaw(mode === 'raw')}
                  minItemWidth="5rem"
                  compact
                />
              </div>
              <div className={styles.ocrContent}>{entry.entry_text}</div>
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          {entry.person_id && (
            <Button variant="secondary" onClick={() => handleEntityClick(entry.person_id || 0)}>
              <Icon name="User" size="sm" style={{ marginRight: '0.25rem' }} />
              <span>View Entity Profile</span>
            </Button>
          )}
          {entry.document_id && (
            <Button
              variant="glass"
              onClick={() => {
                onClose();
                navigate(`/documents/${encodeURIComponent(String(entry.document_id))}`, {
                  state: backLinkState,
                });
              }}
            >
              <Icon name="FileText" size="sm" style={{ marginRight: '0.25rem' }} />
              <span>Source Document</span>
            </Button>
          )}
          <Button variant="glass" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

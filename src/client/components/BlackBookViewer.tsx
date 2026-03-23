import React, { useState, useEffect, useCallback } from 'react';
import { Search, Phone, Mail, MapPin, User, Book, Eye, FileText, ExternalLink } from 'lucide-react';
import { extractCleanName, formatPhoneNumber } from '../utils/prettifyOCR';
import { Link } from 'react-router-dom';
import { AddToInvestigationButton } from './common/AddToInvestigationButton';
import { useNavigate } from 'react-router-dom';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from './common/AutoSizer';

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
  const [entries, setEntries] = useState<BlackBookEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<BlackBookEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<string>('ALL');
  const [hasPhone, setHasPhone] = useState<boolean>(false);
  const [hasEmail, setHasEmail] = useState<boolean>(false);
  const [hasAddress, setHasAddress] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showRaw, setShowRaw] = useState<boolean>(false);
  const navigate = useNavigate();

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const fetchBlackBookEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      // Do not send ALL as a literal server-side filter.
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

      // API now returns {data: [...], total, page, pageSize, totalPages}
      const data = result.data || [];

      // Parse JSON fields safely
      const parsedEntries = data.map((entry: Record<string, unknown>): BlackBookEntry => {
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

      setEntries(parsedEntries);
      setFilteredEntries(parsedEntries);
    } catch (error) {
      console.error('Error fetching Black Book entries:', error);
      setEntries([]);
      setFilteredEntries([]);
      setError(error instanceof Error ? error.message : 'Failed to load Black Book entries');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedLetter, hasPhone, hasEmail, hasAddress, selectedCategory]);

  useEffect(() => {
    fetchBlackBookEntries();
  }, [fetchBlackBookEntries]);

  // Client-side fallback remains if needed
  useEffect(() => {
    setFilteredEntries(entries);
  }, [entries]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <Book className="w-8 h-8 text-[var(--accent)]" />
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              Jeffrey Epstein's Black Book
            </h2>
            <p className="text-[var(--text-muted)] text-sm">
              {filteredEntries.length} of {entries.length} contacts
            </p>
          </div>
        </div>

        {/* Pretty/Raw Toggle */}
        <button
          onClick={() => setShowRaw(!showRaw)}
          className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] transition-all ${
            showRaw
              ? 'bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)] border border-[var(--glass-border)]'
              : 'bg-[var(--accent)] text-[var(--text-primary)] border border-[var(--accent)]'
          }`}
          title={showRaw ? 'Showing raw OCR text' : 'Showing cleaned text'}
        >
          {showRaw ? <FileText className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span className="text-sm font-medium">{showRaw ? 'Raw OCR' : 'Pretty'}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Search by name, phone, email, or address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-[var(--glass-bg)]/50 border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
      </div>

      {/* Alphabet Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedLetter('ALL')}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            selectedLetter === 'ALL'
              ? 'bg-[var(--accent)] text-[var(--text-primary)]'
              : 'bg-[var(--glass-bg)]/50 text-[var(--text-muted)] hover:bg-[var(--glass-bg-highlight)]'
          }`}
        >
          ALL
        </button>
        {alphabet.map((letter) => (
          <button
            key={letter}
            onClick={() => setSelectedLetter(letter)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              selectedLetter === letter
                ? 'bg-[var(--accent)] text-[var(--text-primary)]'
                : 'bg-[var(--glass-bg)]/50 text-[var(--text-muted)] hover:bg-[var(--glass-bg-highlight)]'
            }`}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Contact Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <label className="flex items-center gap-2 text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={hasPhone}
            onChange={(e) => setHasPhone(e.target.checked)}
          />
          <span>Has Phone</span>
          <Phone className="w-4 h-4 text-[var(--text-muted)]" />
        </label>
        <label className="flex items-center gap-2 text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={hasEmail}
            onChange={(e) => setHasEmail(e.target.checked)}
          />
          <span>Has Email</span>
          <Mail className="w-4 h-4 text-[var(--text-muted)]" />
        </label>
        <label className="flex items-center gap-2 text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={hasAddress}
            onChange={(e) => setHasAddress(e.target.checked)}
          />
          <span>Has Address</span>
          <MapPin className="w-4 h-4 text-[var(--text-muted)]" />
        </label>

        <div className="h-6 w-px bg-[var(--glass-bg-highlight)] mx-2 hidden sm:block" />

        <div className="flex bg-[var(--glass-bg)]/80 p-1 rounded-[var(--radius-lg)] border border-[var(--glass-border)]">
          {['ALL', 'Original', 'Contact', 'Credential'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                selectedCategory === cat
                  ? 'bg-[var(--accent)]/20 text-[var(--accent)] border border-[var(--accent)]/30'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Entries Grid - Virtualized */}
      <div className="w-full h-[600px] bg-[var(--glass-bg)]/10 rounded-[var(--radius-lg)]">
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
                  className="blackbook-virtualized-list"
                >
                  {({ index, style }) => {
                    const rowItems = filteredEntries.slice(index * columns, (index + 1) * columns);

                    return (
                      <div
                        style={{ ...style, display: 'flex', gap: '1rem', paddingBottom: '1rem' }}
                      >
                        {rowItems.map((entry) => {
                          const rawName = entry.person_name || extractName(entry.entry_text);
                          const displayName = showRaw
                            ? rawName
                            : extractCleanName(entry.entry_text) || rawName;

                          return (
                            <div
                              key={entry.id}
                              style={{
                                width: `calc(${100 / columns}% - ${((columns - 1) * 16) / columns}px)`,
                              }}
                              className="bg-[var(--glass-bg)]/50 border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-4 flex flex-col hover:border-[var(--accent)]/50 transition-all h-full"
                            >
                              {/* Name - clickable if known entity */}
                              <div className="flex items-center space-x-3 mb-3">
                                {entry.thumbnail_path ? (
                                  <div className="w-10 h-10 rounded-full overflow-hidden border border-[var(--glass-border)] shrink-0 bg-[var(--glass-bg-strong)]">
                                    <img
                                      src={
                                        entry.thumbnail_path.startsWith('/')
                                          ? entry.thumbnail_path
                                          : `/${entry.thumbnail_path}`
                                      }
                                      alt={displayName}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] flex items-center justify-center shrink-0">
                                    <User className="w-5 h-5 text-[var(--accent)]" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  {entry.person_name ? (
                                    <button
                                      onClick={() => handleEntityClick(entry.person_id || 0)}
                                      className="text-lg font-semibold text-[var(--accent)] hover:text-[var(--accent)] hover:underline flex items-center gap-1 transition-colors text-left truncate w-full"
                                      title="Click to view entity profile"
                                    >
                                      <span className="truncate">{displayName}</span>
                                      <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
                                    </button>
                                  ) : (
                                    <h3 className="text-lg font-semibold text-[var(--text-primary)] truncate">
                                      {displayName}
                                    </h3>
                                  )}
                                </div>
                                <div className="ml-auto">
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
                                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] relative z-10"
                                  />
                                </div>
                              </div>

                              {/* Contact Info */}
                              <div className="space-y-2 flex-grow overflow-y-auto pr-2 custom-scrollbar">
                                {/* Phone Numbers */}
                                {entry.phone_numbers.length > 0 && (
                                  <div className="flex items-start space-x-2">
                                    <Phone className="w-4 h-4 text-[var(--text-muted)] mt-1 flex-shrink-0" />
                                    <div className="flex-1">
                                      {entry.phone_numbers.map((phone, idx) => (
                                        <div
                                          key={idx}
                                          className="text-sm text-[var(--text-secondary)]"
                                        >
                                          {showRaw ? phone : formatPhoneNumber(phone)}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Emails */}
                                {entry.email_addresses.length > 0 && (
                                  <div className="flex items-start space-x-2">
                                    <Mail className="w-4 h-4 text-[var(--text-muted)] mt-1 flex-shrink-0" />
                                    <div className="flex-1">
                                      {entry.email_addresses.map((email, idx) => (
                                        <div
                                          key={idx}
                                          className="text-sm text-[var(--text-secondary)] break-all flex items-center justify-between gap-2 group/email"
                                        >
                                          <Link
                                            to={`/emails?search=${encodeURIComponent(email)}`}
                                            className="hover:text-[var(--accent)] hover:underline relative z-10"
                                          >
                                            {email}
                                          </Link>
                                          <Link
                                            to={`/emails?search=${encodeURIComponent(email)}`}
                                            className="opacity-0 group-hover/email:opacity-100 text-[var(--text-muted)] hover:text-[var(--accent)] relative z-10"
                                          >
                                            <ExternalLink className="w-3 h-3" />
                                          </Link>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Addresses */}
                                {entry.addresses.length > 0 && (
                                  <div className="flex items-start space-x-2">
                                    <MapPin className="w-4 h-4 text-[var(--text-muted)] mt-1 flex-shrink-0" />
                                    <div className="flex-1">
                                      {entry.addresses.slice(0, 2).map((address, idx) => (
                                        <div
                                          key={idx}
                                          className="text-sm text-[var(--text-secondary)]"
                                        >
                                          {address}
                                        </div>
                                      ))}
                                      {entry.addresses.length > 2 && (
                                        <div className="text-xs text-[var(--text-muted)] mt-1">
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
                                    <div className="text-sm text-[var(--text-muted)] italic">
                                      No contact information available
                                    </div>
                                  )}
                              </div>

                              {/* Metadata & Categories */}
                              <div className="pt-3 mt-3 flex items-center justify-between border-t border-[var(--glass-border)] shrink-0">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                    entry.entry_category === 'credential'
                                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                      : entry.entry_category === 'contact'
                                        ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                                        : 'bg-[var(--glass-bg-highlight)]/50 text-[var(--text-muted)] border border-[var(--glass-border)]'
                                  }`}
                                >
                                  {entry.entry_category}
                                </span>

                                {entry.document_id && (
                                  <Link
                                    to={`/documents/${entry.document_id}`}
                                    className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] flex items-center gap-1 transition-colors relative z-10"
                                  >
                                    <FileText className="w-3 h-3" />
                                    Source Document
                                  </Link>
                                )}
                              </div>
                            </div>
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
        <div className="text-center py-12">
          <Book className="w-16 h-16 text-[var(--text-primary)] mx-auto mb-4" />
          <p className={`text-lg ${error ? 'text-red-400' : 'text-[var(--text-muted)]'}`}>
            {error ? 'Failed to load contacts' : 'No contacts found'}
          </p>
          <p className="text-[var(--text-muted)] text-sm mt-2">
            {error || 'Try adjusting your search or filter'}
          </p>
          {error && (
            <button
              onClick={fetchBlackBookEntries}
              className="mt-4 px-4 py-2 rounded-[var(--radius-lg)] bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] hover:bg-[var(--glass-bg-highlight)] transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
};

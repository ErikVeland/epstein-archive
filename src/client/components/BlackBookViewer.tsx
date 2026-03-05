import React, { useState, useEffect, useCallback } from 'react';
import { Search, Phone, Mail, MapPin, User, Book, Eye, FileText, ExternalLink } from 'lucide-react';
import { extractCleanName, formatPhoneNumber } from '../utils/prettifyOCR';
import { Link } from 'react-router-dom';
import { AddToInvestigationButton } from './common/AddToInvestigationButton';
import { useNavigate } from 'react-router-dom';

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

export const BlackBookViewer: React.FC = () => {
  const [entries, setEntries] = useState<BlackBookEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<BlackBookEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
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
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (selectedLetter) params.set('letter', selectedLetter);
      if (hasPhone) params.set('hasPhone', 'true');
      if (hasEmail) params.set('hasEmail', 'true');
      if (hasAddress) params.set('hasAddress', 'true');
      if (selectedCategory !== 'ALL') params.set('category', selectedCategory.toLowerCase());
      params.set('limit', '5000');

      const response = await fetch(`/api/black-book?${params.toString()}`);
      const result = await response.json();

      // API now returns {data: [...], total, page, pageSize, totalPages}
      const data = result.data || [];

      // Parse JSON fields safely
      const parsedEntries = data.map((entry: any): BlackBookEntry => {
        let phone_numbers = [];
        let addresses = [];
        let email_addresses = [];
        const rawPhones = entry.phone_numbers ?? entry.phoneNumbers;
        const rawAddresses = entry.addresses;
        const rawEmails = entry.email_addresses ?? entry.emailAddresses;

        try {
          phone_numbers = Array.isArray(rawPhones)
            ? rawPhones
            : rawPhones
              ? JSON.parse(rawPhones)
              : [];
        } catch (_e) {
          console.warn('Failed to parse phone_numbers for entry', entry.id, rawPhones);
          // Fallback: if it looks like a string, wrap it
          if (typeof rawPhones === 'string' && !rawPhones.startsWith('[')) {
            phone_numbers = [rawPhones];
          }
        }

        try {
          addresses = Array.isArray(rawAddresses)
            ? rawAddresses
            : rawAddresses
              ? JSON.parse(rawAddresses)
              : [];
        } catch (_e) {
          console.warn('Failed to parse addresses for entry', entry.id);
        }

        try {
          email_addresses = Array.isArray(rawEmails)
            ? rawEmails
            : rawEmails
              ? JSON.parse(rawEmails)
              : [];
        } catch (_e) {
          console.warn('Failed to parse email_addresses for entry', entry.id);
        }

        return {
          id: Number(entry.id),
          person_id:
            entry.person_id != null
              ? Number(entry.person_id)
              : entry.personId != null
                ? Number(entry.personId)
                : null,
          entry_text: String(entry.entry_text ?? entry.entryText ?? ''),
          phone_numbers,
          addresses,
          email_addresses,
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
          person_name: (entry.person_name ?? entry.displayName ?? undefined) || undefined,
          thumbnail_path: entry.thumbnail_path || entry.thumbnailPath,
        };
      });

      setEntries(parsedEntries);
      setFilteredEntries(parsedEntries);
    } catch (error) {
      console.error('Error fetching Black Book entries:', error);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <Book className="w-8 h-8 text-cyan-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Jeffrey Epstein's Black Book</h2>
            <p className="text-slate-400 text-sm">
              {filteredEntries.length} of {entries.length} contacts
            </p>
          </div>
        </div>

        {/* Pretty/Raw Toggle */}
        <button
          onClick={() => setShowRaw(!showRaw)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            showRaw
              ? 'bg-slate-700 text-slate-300 border border-slate-600'
              : 'bg-cyan-600 text-white border border-cyan-500'
          }`}
          title={showRaw ? 'Showing raw OCR text' : 'Showing cleaned text'}
        >
          {showRaw ? <FileText className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span className="text-sm font-medium">{showRaw ? 'Raw OCR' : 'Pretty'}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, phone, email, or address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      {/* Alphabet Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedLetter('ALL')}
          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
            selectedLetter === 'ALL'
              ? 'bg-cyan-500 text-white'
              : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'
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
                ? 'bg-cyan-500 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Contact Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <label className="flex items-center gap-2 text-slate-300">
          <input
            type="checkbox"
            checked={hasPhone}
            onChange={(e) => setHasPhone(e.target.checked)}
          />
          <span>Has Phone</span>
          <Phone className="w-4 h-4 text-slate-400" />
        </label>
        <label className="flex items-center gap-2 text-slate-300">
          <input
            type="checkbox"
            checked={hasEmail}
            onChange={(e) => setHasEmail(e.target.checked)}
          />
          <span>Has Email</span>
          <Mail className="w-4 h-4 text-slate-400" />
        </label>
        <label className="flex items-center gap-2 text-slate-300">
          <input
            type="checkbox"
            checked={hasAddress}
            onChange={(e) => setHasAddress(e.target.checked)}
          />
          <span>Has Address</span>
          <MapPin className="w-4 h-4 text-slate-400" />
        </label>

        <div className="h-6 w-px bg-slate-700 mx-2 hidden sm:block" />

        <div className="flex bg-slate-800/80 p-1 rounded-lg border border-slate-700/50">
          {['ALL', 'Original', 'Contact', 'Credential'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                selectedCategory === cat
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Entries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEntries.map((entry) => {
          const rawName = entry.person_name || extractName(entry.entry_text);
          const displayName = showRaw ? rawName : extractCleanName(entry.entry_text) || rawName;

          return (
            <div
              key={entry.id}
              className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-cyan-500/50 transition-all"
            >
              {/* Name - clickable if known entity */}
              <div className="flex items-center space-x-3 mb-3">
                {entry.thumbnail_path ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-600 shrink-0 bg-slate-900">
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
                  <div className="w-10 h-10 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-cyan-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {entry.person_name ? (
                    <button
                      onClick={() => handleEntityClick(entry.person_id || 0)}
                      className="text-lg font-semibold text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 transition-colors text-left truncate w-full"
                      title="Click to view entity profile"
                    >
                      <span className="truncate">{displayName}</span>
                      <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
                    </button>
                  ) : (
                    <h3 className="text-lg font-semibold text-white truncate">{displayName}</h3>
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
                    className="text-slate-500 hover:text-white"
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2">
                {/* Phone Numbers */}
                {entry.phone_numbers.length > 0 && (
                  <div className="flex items-start space-x-2">
                    <Phone className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      {entry.phone_numbers.map((phone, idx) => (
                        <div key={idx} className="text-sm text-slate-300">
                          {showRaw ? phone : formatPhoneNumber(phone)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emails */}
                {entry.email_addresses.length > 0 && (
                  <div className="flex items-start space-x-2">
                    <Mail className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      {entry.email_addresses.map((email, idx) => (
                        <div
                          key={idx}
                          className="text-sm text-slate-300 break-all flex items-center justify-between gap-2 group/email"
                        >
                          <Link
                            to={`/emails?search=${encodeURIComponent(email)}`}
                            className="hover:text-cyan-400 hover:underline"
                          >
                            {email}
                          </Link>
                          <Link
                            to={`/emails?search=${encodeURIComponent(email)}`}
                            className="opacity-0 group-hover/email:opacity-100 text-slate-500 hover:text-cyan-400"
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
                    <MapPin className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      {entry.addresses.slice(0, 2).map((address, idx) => (
                        <div key={idx} className="text-sm text-slate-300">
                          {address}
                        </div>
                      ))}
                      {entry.addresses.length > 2 && (
                        <div className="text-xs text-slate-500 mt-1">
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
                    <div className="text-sm text-slate-500 italic">
                      No contact information available
                    </div>
                  )}

                {/* Metadata & Categories */}
                <div className="pt-3 mt-auto flex items-center justify-between border-t border-slate-700/50">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      entry.entry_category === 'credential'
                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        : entry.entry_category === 'contact'
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : 'bg-slate-700/50 text-slate-400 border border-slate-600/30'
                    }`}
                  >
                    {entry.entry_category}
                  </span>

                  {entry.document_id && (
                    <Link
                      to={`/documents/${entry.document_id}`}
                      className="text-[10px] text-slate-500 hover:text-cyan-400 flex items-center gap-1 transition-colors"
                    >
                      <FileText className="w-3 h-3" />
                      Source Document
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredEntries.length === 0 && (
        <div className="text-center py-12">
          <Book className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">No contacts found</p>
          <p className="text-slate-500 text-sm mt-2">Try adjusting your search or filter</p>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { Users, Plus, X, Search } from 'lucide-react';
import styles from './PeopleSelector.module.css';

export interface PersonData {
  id: number;
  name: string;
  role: string;
  redFlagRating?: number;
}

interface PeopleSelectorProps {
  selectedPeople: PersonData[];
  onPeopleChange: (people: PersonData[]) => void;
  onPersonClick?: (person: PersonData) => void;
  mediaId: number;
  className?: string;
  isAdmin?: boolean;
}

export const PeopleSelector: React.FC<PeopleSelectorProps> = ({
  selectedPeople,
  onPeopleChange,
  onPersonClick,
  mediaId,
  className = '',
  isAdmin = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<PersonData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced entity search
  if (!searchTerm.trim() && searchResults.length !== 0) {
    setSearchResults([]);
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchTerm.trim()) return;

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/entities?search=${encodeURIComponent(searchTerm)}&limit=10`);
        const data = await res.json();
        const people = (data.data || data).map((e: Record<string, unknown>) => ({
          id: e.id,
          name: e.fullName || e.name,
          role: e.primaryRole || e.role || 'Unknown',
          redFlagRating: e.redFlagRating ?? 0,
        }));
        setSearchResults(
          people.filter((p: PersonData) => !selectedPeople.some((sp) => sp.id === p.id)),
        );
      } catch (error) {
        console.error('Failed to search entities:', error);
      }
      setIsSearching(false);
    }, 300);
  }, [searchTerm, selectedPeople]);

  const handleAddPerson = async (person: PersonData) => {
    try {
      await fetch(`/api/media/images/${mediaId}/people`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId: person.id }),
      });
      onPeopleChange([...selectedPeople, person]);
      setSearchTerm('');
      setSearchResults([]);
    } catch (error) {
      console.error('Failed to add person:', error);
    }
  };

  const handleRemovePerson = async (person: PersonData) => {
    try {
      await fetch(`/api/media/images/${mediaId}/people/${person.id}`, { method: 'DELETE' });
      onPeopleChange(selectedPeople.filter((p) => p.id !== person.id));
    } catch (error) {
      console.error('Failed to remove person:', error);
    }
  };

  const getRedFlagColor = (rating: number = 0) => {
    if (rating >= 4) return styles.riskDanger;
    if (rating >= 3) return styles.riskWarning;
    if (rating >= 2) return styles.riskAccent;
    return styles.riskMuted;
  };

  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')}>
      <div className={styles.header}>
        <Users className={styles.icon} />
        People in Photo
      </div>

      {/* Selected People */}
      <div className={styles.list}>
        {selectedPeople.map((person) => (
          <div
            key={person.id}
            className={`${styles.personRow} ${onPersonClick ? styles.clickable : ''}`}
            onClick={() => onPersonClick && onPersonClick(person)}
          >
            <div>
              <div className={styles.name}>{person.name}</div>
              <div className={`${styles.meta} ${getRedFlagColor(person.redFlagRating)}`}>
                {person.role}
                {person.redFlagRating ? ` • 🚩 ${person.redFlagRating}` : ''}
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemovePerson(person);
                }}
                className={styles.removeButton}
              >
                <X className={styles.icon} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Person Search - Admin Only */}
      {isAdmin && (
        <div className={styles.searchWrap} ref={dropdownRef}>
          <div className={styles.searchFieldWrap}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search people to add..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              className={styles.input}
            />
          </div>

          {/* Search Results Dropdown */}
          {showDropdown && (searchResults.length > 0 || isSearching) && (
            <div className={`${styles.dropdown} dropdown-surface`}>
              {isSearching ? (
                <div className={styles.searching}>Searching...</div>
              ) : (
                <div className={styles.results}>
                  {searchResults.map((person) => (
                    <button
                      key={person.id}
                      onClick={() => handleAddPerson(person)}
                      className={styles.resultButton}
                    >
                      <div>
                        <div className={styles.name}>{person.name}</div>
                        <div className={`${styles.meta} ${getRedFlagColor(person.redFlagRating)}`}>
                          {person.role}
                        </div>
                      </div>
                      <Plus className={`${styles.icon} ${styles.riskMuted}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PeopleSelector;

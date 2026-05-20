import React, { useState, useEffect, useRef } from 'react';
import Icon from '@client/components/common/Icon';
import styles from './PeopleSelector.module.css';

import { Button, Input } from '@client/design-system/lib';
import { apiClient } from '@client/services/apiClient';
import { useToasts } from '@client/components/common/useToasts';

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
  const [savingPersonId, setSavingPersonId] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const { addToast } = useToasts();

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
    if (!searchTerm.trim()) {
      setIsSearching(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await apiClient.get<
          { data?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>
        >(`/entities?search=${encodeURIComponent(searchTerm)}&limit=20`);
        const rawPeople = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : [];
        const people: PersonData[] = rawPeople.map((e: Record<string, unknown>) => ({
          id: Number(e.id),
          name: String(e.fullName || e.name || `Entity ${e.id}`),
          role: String(e.primaryRole || e.role || 'Unknown'),
          redFlagRating: Number(e.redFlagRating ?? 0),
        }));
        setSearchResults(
          people.filter((p: PersonData) => !selectedPeople.some((sp) => sp.id === p.id)),
        );
      } catch (error) {
        console.error('Failed to search entities:', error);
        addToast({ text: 'Failed to search people', type: 'error' });
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [addToast, searchTerm, selectedPeople]);

  const handleAddPerson = async (person: PersonData) => {
    try {
      setSavingPersonId(person.id);
      await apiClient.addPersonToMediaImage(mediaId, person.id);
      onPeopleChange([...selectedPeople, person]);
      setSearchTerm('');
      setSearchResults([]);
      addToast({ text: `Tagged ${person.name}`, type: 'success' });
    } catch (error) {
      console.error('Failed to add person:', error);
      addToast({
        text: error instanceof Error ? error.message : 'Failed to tag person',
        type: 'error',
      });
    } finally {
      setSavingPersonId(null);
    }
  };

  const handleRemovePerson = async (person: PersonData) => {
    try {
      setSavingPersonId(person.id);
      await apiClient.removePersonFromMediaImage(mediaId, person.id);
      onPeopleChange(selectedPeople.filter((p) => p.id !== person.id));
      addToast({ text: `Removed ${person.name}`, type: 'success' });
    } catch (error) {
      console.error('Failed to remove person:', error);
      addToast({
        text: error instanceof Error ? error.message : 'Failed to remove person',
        type: 'error',
      });
    } finally {
      setSavingPersonId(null);
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
        <Icon name="Users" className={styles.icon} />
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
                {person.redFlagRating ? ` • Risk ${person.redFlagRating}` : ''}
              </div>
            </div>
            {isAdmin && (
              <Button
                unstyled
                disabled={savingPersonId === person.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemovePerson(person);
                }}
                className={styles.removeButton}
              >
                <Icon name="X" className={styles.icon} />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Add Person Search - Admin Only */}
      {isAdmin && (
        <div className={styles.searchWrap} ref={dropdownRef}>
          <div className={styles.searchFieldWrap}>
            <Icon name="Search" className={styles.searchIcon} />
            <Input
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
                    <Button
                      unstyled
                      key={person.id}
                      onClick={() => handleAddPerson(person)}
                      disabled={savingPersonId === person.id}
                      className={styles.resultButton}
                    >
                      <div>
                        <div className={styles.name}>{person.name}</div>
                        <div className={`${styles.meta} ${getRedFlagColor(person.redFlagRating)}`}>
                          {person.role}
                        </div>
                      </div>
                      <Icon name="Plus" className={`${styles.icon} ${styles.riskMuted}`} />
                    </Button>
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

import React, { useState, useEffect, useRef } from 'react';
import { Users, Plus, X, Search } from 'lucide-react';

interface PersonData {
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
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/entities?search=${encodeURIComponent(searchTerm)}&limit=10`);
        const data = await res.json();
        const people = (data.data || data).map((e: any) => ({
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
    if (rating >= 4) return 'text-red-400';
    if (rating >= 3) return 'text-orange-400';
    if (rating >= 2) return 'text-yellow-400';
    return 'text-slate-400';
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
        <Users className="w-4 h-4" />
        People in Photo
      </div>

      {/* Selected People */}
      <div className="space-y-2">
        {selectedPeople.map((person) => (
          <div
            key={person.id}
            className={`flex items-center justify-between p-2 bg-slate-800/50 rounded-lg border border-slate-700/50 ${onPersonClick ? 'cursor-pointer hover:bg-slate-800 transition-colors' : ''}`}
            onClick={() => onPersonClick && onPersonClick(person)}
          >
            <div>
              <div className="text-sm text-white font-medium">{person.name}</div>
              <div className={`text-xs ${getRedFlagColor(person.redFlagRating)}`}>
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
                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Person Search - Admin Only */}
      {isAdmin && (
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search people to add..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Search Results Dropdown */}
          {showDropdown && (searchResults.length > 0 || isSearching) && (
            <div className="absolute z-50 mt-1 w-full dropdown-surface overflow-hidden">
              {isSearching ? (
                <div className="p-3 text-center text-sm text-slate-400">Searching...</div>
              ) : (
                <div className="max-h-48 overflow-y-auto">
                  {searchResults.map((person) => (
                    <button
                      key={person.id}
                      onClick={() => handleAddPerson(person)}
                      className="w-full flex items-center justify-between p-2 hover:bg-slate-700/50 text-left"
                    >
                      <div>
                        <div className="text-sm text-white">{person.name}</div>
                        <div className={`text-xs ${getRedFlagColor(person.redFlagRating)}`}>
                          {person.role}
                        </div>
                      </div>
                      <Plus className="w-4 h-4 text-slate-400" />
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

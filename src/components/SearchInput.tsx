import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, MapPin, Calendar, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchSuggestion {
  id: string;
  type: 'location' | 'property' | 'user';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
}

interface SearchInputProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
  showSuggestions?: boolean;
  isMobile?: boolean;
}

const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = "Search destinations, properties, or people...",
  onSearch,
  className,
  showSuggestions = true,
  isMobile = false
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mock suggestions data - replace with actual API calls
  const mockSuggestions = useMemo<SearchSuggestion[]>(() => [
    {
      id: '1',
      type: 'location',
      title: 'Paris, France',
      subtitle: '250+ properties available',
      icon: <MapPin className="w-4 h-4" />
    },
    {
      id: '2',
      type: 'location',
      title: 'Tokyo, Japan',
      subtitle: '180+ properties available',
      icon: <MapPin className="w-4 h-4" />
    },
    {
      id: '3',
      type: 'property',
      title: 'Luxury Apartment in Manhattan',
      subtitle: 'New York, USA',
      icon: <Calendar className="w-4 h-4" />
    },
    {
      id: '4',
      type: 'user',
      title: 'Travel Community',
      subtitle: 'Connect with travelers',
      icon: <Users className="w-4 h-4" />
    }
  ], []);

  // Filter suggestions based on query
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    
    // Simulate API delay
    const timeoutId = setTimeout(() => {
      const filtered = mockSuggestions.filter(
        suggestion =>
          suggestion.title.toLowerCase().includes(query.toLowerCase()) ||
          (suggestion.subtitle && suggestion.subtitle.toLowerCase().includes(query.toLowerCase()))
      );
      setSuggestions(filtered);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, mockSuggestions]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(value.length > 0 && showSuggestions);
  };

  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (finalQuery.trim()) {
      onSearch?.(finalQuery.trim());
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.title);
    handleSearch(suggestion.title);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(query.length > 0 && showSuggestions)}
          placeholder={placeholder}
          className={cn(
            "w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg",
            "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
            "placeholder-gray-500",
            isMobile ? "text-base" : "text-base"
          )}
          aria-label="Search"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          role="combobox"
        />

        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-4 flex items-center hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && showSuggestions && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin mx-auto w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <p className="mt-2 text-sm">Searching...</p>
            </div>
          ) : suggestions.length > 0 ? (
            <ul role="listbox" className="py-1">
              {suggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  <button
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none flex items-center space-x-3"
                    role="option"
                  >
                    <div className="flex-shrink-0 text-gray-400">
                      {suggestion.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {suggestion.title}
                      </p>
                      {suggestion.subtitle && (
                        <p className="text-xs text-gray-500 truncate">
                          {suggestion.subtitle}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <span className={cn(
                        "inline-flex px-2 py-1 text-xs font-medium rounded-full",
                        suggestion.type === 'location' && "bg-primary-100 text-primary-800",
                        suggestion.type === 'property' && "bg-green-100 text-green-800",
                        suggestion.type === 'user' && "bg-purple-100 text-purple-800"
                      )}>
                        {suggestion.type}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : query.length >= 2 ? (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">No results found for "{query}"</p>
              <button
                onClick={() => handleSearch()}
                className="mt-2 text-primary-600 hover:text-primary-800 text-sm font-medium"
              >
                Search anyway
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SearchInput;

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, MapPin, Calendar, Users, Filter, Star, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchSuggestion {
  id: string;
  type: 'location' | 'property' | 'user' | 'recent';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  rating?: number;
  price?: string;
  category?: string;
}

interface SearchFilters {
  type: 'all' | 'location' | 'property' | 'user';
  priceRange: string;
  rating: number;
  sortBy: 'relevance' | 'price' | 'rating' | 'recent';
}

interface AdvancedSearchInputProps {
  placeholder?: string;
  onSearch?: (query: string, filters?: SearchFilters) => void;
  className?: string;
  showSuggestions?: boolean;
  showFilters?: boolean;
  isMobile?: boolean;
}

const AdvancedSearchInput: React.FC<AdvancedSearchInputProps> = ({
  placeholder = "Search destinations, properties, or people...",
  onSearch,
  className,
  showSuggestions = true,
  showFilters = false,
  isMobile = false
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    type: 'all',
    priceRange: 'any',
    rating: 0,
    sortBy: 'relevance'
  });
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Enhanced mock suggestions with more data
  const mockSuggestions = useMemo<SearchSuggestion[]>(() => [
    {
      id: '1',
      type: 'location',
      title: 'Paris, France',
      subtitle: '250+ properties available',
      icon: <MapPin className="w-4 h-4" />,
      category: 'Popular Destination'
    },
    {
      id: '2',
      type: 'location',
      title: 'Tokyo, Japan',
      subtitle: '180+ properties available',
      icon: <MapPin className="w-4 h-4" />,
      category: 'Trending'
    },
    {
      id: '3',
      type: 'property',
      title: 'Luxury Apartment in Montmartre',
      subtitle: 'Paris, France',
      icon: <Calendar className="w-4 h-4" />,
      rating: 4.8,
      price: '$120/night',
      category: 'Luxury'
    },
    {
      id: '4',
      type: 'property',
      title: 'Cozy Studio near Eiffel Tower',
      subtitle: 'Paris, France',
      icon: <Calendar className="w-4 h-4" />,
      rating: 4.5,
      price: '$85/night',
      category: 'Budget'
    },
    {
      id: '5',
      type: 'user',
      title: 'Travel Enthusiast Community',
      subtitle: 'Connect with travelers',
      icon: <Users className="w-4 h-4" />,
      category: 'Community'
    },
    {
      id: '6',
      type: 'location',
      title: 'Bali, Indonesia',
      subtitle: '320+ properties available',
      icon: <MapPin className="w-4 h-4" />,
      category: 'Beach Destination'
    }
  ], []);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('openStayRecentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Filter suggestions based on query and filters
  useEffect(() => {
    if (query.length < 1) {
      // Show recent searches when no query
      const recentSuggestions: SearchSuggestion[] = recentSearches.slice(0, 5).map((search, index) => ({
        id: `recent-${index}`,
        type: 'recent',
        title: search,
        subtitle: 'Recent search',
        icon: <Clock className="w-4 h-4" />
      }));
      setSuggestions(recentSuggestions);
      return;
    }

    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    
    const timeoutId = setTimeout(() => {
      let filtered = mockSuggestions.filter(
        suggestion =>
          suggestion.title.toLowerCase().includes(query.toLowerCase()) ||
          (suggestion.subtitle && suggestion.subtitle.toLowerCase().includes(query.toLowerCase())) ||
          (suggestion.category && suggestion.category.toLowerCase().includes(query.toLowerCase()))
      );

      // Apply type filter
      if (filters.type !== 'all') {
        filtered = filtered.filter(s => s.type === filters.type);
      }

      // Apply rating filter
      if (filters.rating > 0) {
        filtered = filtered.filter(s => !s.rating || s.rating >= filters.rating);
      }

      // Sort results
      filtered.sort((a, b) => {
        switch (filters.sortBy) {
          case 'rating':
            return (b.rating || 0) - (a.rating || 0);
          case 'price': {
            const aPrice = parseFloat(a.price?.replace(/[^0-9.]/g, '') || '0');
            const bPrice = parseFloat(b.price?.replace(/[^0-9.]/g, '') || '0');
            return aPrice - bPrice;
          }
          case 'recent':
            return 0; // Would normally sort by recency
          default:
            return 0; // Relevance (default order)
        }
      });

      setSuggestions(filtered);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, mockSuggestions, filters, recentSearches]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowFilterPanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveRecentSearch = (searchQuery: string) => {
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('openStayRecentSearches', JSON.stringify(updated));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(showSuggestions);
  };

  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (finalQuery.trim()) {
      saveRecentSearch(finalQuery.trim());
      onSearch?.(finalQuery.trim(), filters);
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'recent') {
      setQuery(suggestion.title);
      handleSearch(suggestion.title);
    } else {
      setQuery(suggestion.title);
      handleSearch(suggestion.title);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setShowFilterPanel(false);
      inputRef.current?.blur();
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('openStayRecentSearches');
    setSuggestions([]);
  };

  const toggleFilter = () => {
    setShowFilterPanel(!showFilterPanel);
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
          onFocus={() => setIsOpen(showSuggestions)}
          placeholder={placeholder}
          className={cn(
            "w-full pl-12 pr-20 py-3 border border-gray-300 rounded-lg",
            "focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
            "placeholder-gray-500",
            isMobile ? "text-base" : "text-base"
          )}
          aria-label="Search"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          role="combobox"
        />

        <div className="absolute inset-y-0 right-0 flex items-center">
          {query && (
            <button
              onClick={clearSearch}
              className="p-2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          
          {showFilters && (
            <button
              onClick={toggleFilter}
              className={cn(
                "p-2 mr-2 text-gray-400 hover:text-gray-600",
                showFilterPanel && "text-primary-600"
              )}
              aria-label="Toggle filters"
            >
              <Filter className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilterPanel && showFilters && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as SearchFilters['type'] }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Types</option>
                <option value="location">Locations</option>
                <option value="property">Properties</option>
                <option value="user">People</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Rating</label>
              <select
                value={filters.rating}
                onChange={(e) => setFilters(prev => ({ ...prev, rating: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value={0}>Any Rating</option>
                <option value={3}>3+ Stars</option>
                <option value={4}>4+ Stars</option>
                <option value={4.5}>4.5+ Stars</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
              <select
                value={filters.priceRange}
                onChange={(e) => setFilters(prev => ({ ...prev, priceRange: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="any">Any Price</option>
                <option value="budget">Under $50</option>
                <option value="mid">$50 - $150</option>
                <option value="luxury">$150+</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as SearchFilters['sortBy'] }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="relevance">Relevance</option>
                <option value="rating">Rating</option>
                <option value="price">Price</option>
                <option value="recent">Recent</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions Dropdown */}
      {isOpen && showSuggestions && (
        <div className="absolute z-40 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin mx-auto w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full"></div>
              <p className="mt-2 text-sm">Searching...</p>
            </div>
          ) : suggestions.length > 0 ? (
            <>
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
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {suggestion.title}
                          </p>
                          {suggestion.rating && (
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3 text-yellow-400 fill-current" />
                              <span className="text-xs text-gray-600">{suggestion.rating}</span>
                            </div>
                          )}
                        </div>
                        {suggestion.subtitle && (
                          <p className="text-xs text-gray-500 truncate">
                            {suggestion.subtitle}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end space-y-1">
                        {suggestion.price && (
                          <span className="text-sm font-semibold text-green-600">
                            {suggestion.price}
                          </span>
                        )}
                        <span className={cn(
                          "inline-flex px-2 py-1 text-xs font-medium rounded-full",
                          suggestion.type === 'location' && "bg-blue-100 text-blue-800",
                          suggestion.type === 'property' && "bg-green-100 text-green-800",
                          suggestion.type === 'user' && "bg-purple-100 text-purple-800",
                          suggestion.type === 'recent' && "bg-gray-100 text-gray-800"
                        )}>
                          {suggestion.category || suggestion.type}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              
              {recentSearches.length > 0 && suggestions.some(s => s.type === 'recent') && (
                <div className="border-t border-gray-200 p-2">
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear recent searches
                  </button>
                </div>
              )}
            </>
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
          ) : query.length === 0 && recentSearches.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">Start typing to see suggestions</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default AdvancedSearchInput;

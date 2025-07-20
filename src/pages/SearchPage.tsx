import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, MapPin, Calendar, Users, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'location' | 'property' | 'user';
  title: string;
  subtitle: string;
  description: string;
  image?: string;
  price?: string;
  rating?: number;
  tags?: string[];
}

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all',
    priceRange: 'all',
    rating: 0
  });

  const query = searchParams.get('q') || '';

  // Mock search results - replace with actual API calls
  const mockResults = useMemo<SearchResult[]>(() => [
    {
      id: '1',
      type: 'location',
      title: 'Paris, France',
      subtitle: 'City of Lights',
      description: 'Discover amazing accommodations in the romantic capital of France',
      image: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=300&h=200&fit=crop',
      tags: ['Popular', 'Romantic', 'Culture']
    },
    {
      id: '2',
      type: 'property',
      title: 'Luxury Apartment in Montmartre',
      subtitle: 'Paris, France',
      description: 'Beautiful 2-bedroom apartment with stunning city views',
      image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=300&h=200&fit=crop',
      price: '$120/night',
      rating: 4.8,
      tags: ['Luxury', 'City View', 'WiFi']
    },
    {
      id: '3',
      type: 'property',
      title: 'Cozy Studio near Eiffel Tower',
      subtitle: 'Paris, France',
      description: 'Perfect for couples, walking distance to major attractions',
      image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=300&h=200&fit=crop',
      price: '$85/night',
      rating: 4.5,
      tags: ['Romantic', 'Central', 'Walking Distance']
    },
    {
      id: '4',
      type: 'user',
      title: 'Travel Enthusiast Community',
      subtitle: 'Paris Travel Group',
      description: 'Connect with fellow travelers exploring Paris',
      tags: ['Community', 'Local Tips', 'Meetups']
    }
  ], []);

  useEffect(() => {
    if (query) {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        const filtered = mockResults.filter(result => 
          result.title.toLowerCase().includes(query.toLowerCase()) ||
          result.subtitle.toLowerCase().includes(query.toLowerCase()) ||
          result.description.toLowerCase().includes(query.toLowerCase())
        );
        setResults(filtered);
        setLoading(false);
      }, 500);
    }
  }, [query, mockResults]);

  const handleSearch = (newQuery: string) => {
    setSearchParams({ q: newQuery });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'location':
        return <MapPin className="w-4 h-4" />;
      case 'property':
        return <Calendar className="w-4 h-4" />;
      case 'user':
        return <Users className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'location':
        return 'bg-blue-100 text-blue-800';
      case 'property':
        return 'bg-green-100 text-green-800';
      case 'user':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Search Results
              </h1>
              {query && (
                <p className="text-gray-600">
                  Showing results for "<span className="font-medium">{query}</span>"
                </p>
              )}
            </div>
            
            {/* Filters */}
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </button>
              
              <select 
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="location">Locations</option>
                <option value="property">Properties</option>
                <option value="user">People</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-center space-x-3">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="text-gray-600">Searching...</span>
            </div>
          </div>
        )}

        {/* Results */}
        {!loading && (
          <div className="space-y-4">
            {results.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-gray-600">
                    {results.length} result{results.length !== 1 ? 's' : ''} found
                  </p>
                </div>
                
                <div className="grid gap-4">
                  {results.map((result) => (
                    <div
                      key={result.id}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        {result.image && (
                          <img
                            src={result.image}
                            alt={result.title}
                            className="w-full lg:w-48 h-32 object-cover rounded-lg"
                          />
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className={cn(
                                "inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full",
                                getTypeColor(result.type)
                              )}>
                                {getTypeIcon(result.type)}
                                <span className="capitalize">{result.type}</span>
                              </span>
                              {result.rating && (
                                <div className="flex items-center space-x-1">
                                  <span className="text-yellow-400">★</span>
                                  <span className="text-sm font-medium">{result.rating}</span>
                                </div>
                              )}
                            </div>
                            {result.price && (
                              <span className="text-lg font-semibold text-green-600">
                                {result.price}
                              </span>
                            )}
                          </div>
                          
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {result.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {result.subtitle}
                          </p>
                          <p className="text-gray-700 mb-3">
                            {result.description}
                          </p>
                          
                          {result.tags && result.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {result.tags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : query ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No results found
                </h3>
                <p className="text-gray-600 mb-4">
                  We couldn't find anything matching "{query}". Try adjusting your search terms.
                </p>
                <button
                  onClick={() => handleSearch('')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Start your search
                </h3>
                <p className="text-gray-600">
                  Enter a search term to find locations, properties, or people.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;

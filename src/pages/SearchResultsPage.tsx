import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { MapPin, Star, Heart, Filter, Grid, List, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import AdvancedSearchInput from '@/components/AdvancedSearchInput';

interface SearchResult {
  id: string;
  type: 'location' | 'property' | 'user';
  title: string;
  subtitle: string;
  description: string;
  image: string;
  rating?: number;
  reviewCount?: number;
  price?: string;
  location: string;
  amenities?: string[];
  highlights?: string[];
  host?: {
    name: string;
    avatar: string;
    isSuperhost: boolean;
  };
  isLiked?: boolean;
  category?: string;
}

interface SearchFilters {
  type: 'all' | 'location' | 'property' | 'user';
  priceRange: string;
  rating: number;
  sortBy: 'relevance' | 'price' | 'rating' | 'recent';
}

const SearchResultsPage: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    type: 'all',
    priceRange: 'any',
    rating: 0,
    sortBy: 'relevance'
  });

  // Mock search results
  const mockResults = React.useMemo<SearchResult[]>(() => [
    {
      id: '1',
      type: 'property',
      title: 'Luxury Apartment in Montmartre',
      subtitle: 'Entire apartment • 2 bedrooms',
      description: 'Stunning views of Sacré-Cœur from this beautifully renovated apartment with modern amenities and classic Parisian charm.',
      image: '/api/placeholder/400/300',
      rating: 4.8,
      reviewCount: 127,
      price: '$120/night',
      location: 'Montmartre, Paris',
      amenities: ['WiFi', 'Kitchen', 'Washer', 'Balcony'],
      highlights: ['Great location', 'Recently renovated', 'City views'],
      host: {
        name: 'Marie Dubois',
        avatar: '/api/placeholder/40/40',
        isSuperhost: true
      },
      isLiked: false,
      category: 'Luxury'
    },
    {
      id: '2',
      type: 'property',
      title: 'Cozy Studio near Eiffel Tower',
      subtitle: 'Private room • 1 bedroom',
      description: 'Charming studio apartment just a 10-minute walk from the Eiffel Tower. Perfect for couples looking for a romantic getaway.',
      image: '/api/placeholder/400/300',
      rating: 4.5,
      reviewCount: 89,
      price: '$85/night',
      location: 'Champ de Mars, Paris',
      amenities: ['WiFi', 'Kitchen', 'Heating'],
      highlights: ['Near Eiffel Tower', 'Romantic setting', 'Good value'],
      host: {
        name: 'Jean-Pierre Martin',
        avatar: '/api/placeholder/40/40',
        isSuperhost: false
      },
      isLiked: true,
      category: 'Budget'
    },
    {
      id: '3',
      type: 'location',
      title: 'Paris, France',
      subtitle: 'Popular destination',
      description: 'Discover the City of Light with its iconic landmarks, world-class museums, charming cafés, and rich cultural heritage.',
      image: '/api/placeholder/400/300',
      rating: 4.7,
      reviewCount: 2453,
      location: 'France',
      highlights: ['Historic landmarks', 'Art museums', 'Fine dining', 'Fashion capital'],
      category: 'Top Destination'
    },
    {
      id: '4',
      type: 'user',
      title: 'Paris Travel Community',
      subtitle: '1,247 members',
      description: 'Connect with local Parisians and fellow travelers. Share tips, find travel companions, and discover hidden gems in the city.',
      image: '/api/placeholder/400/300',
      location: 'Paris, France',
      highlights: ['Local insights', 'Travel companions', 'Hidden gems', 'Cultural exchange'],
      category: 'Community'
    },
    {
      id: '5',
      type: 'property',
      title: 'Modern Loft in Le Marais',
      subtitle: 'Entire loft • 3 bedrooms',
      description: 'Spacious industrial-style loft in the heart of Le Marais, featuring exposed brick walls and contemporary furnishings.',
      image: '/api/placeholder/400/300',
      rating: 4.9,
      reviewCount: 156,
      price: '$180/night',
      location: 'Le Marais, Paris',
      amenities: ['WiFi', 'Kitchen', 'Washer', 'Air conditioning', 'Workspace'],
      highlights: ['Historic district', 'Modern amenities', 'Prime location'],
      host: {
        name: 'Sophie Laurent',
        avatar: '/api/placeholder/40/40',
        isSuperhost: true
      },
      isLiked: false,
      category: 'Premium'
    }
  ], []);

  const performSearch = React.useCallback(async (searchQuery: string, searchFilters: SearchFilters) => {
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let filtered = mockResults.filter(result =>
      result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.location.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Apply filters
    if (searchFilters.type !== 'all') {
      filtered = filtered.filter(result => result.type === searchFilters.type);
    }

    if (searchFilters.rating > 0) {
      filtered = filtered.filter(result => !result.rating || result.rating >= searchFilters.rating);
    }

    // Sort results
    filtered.sort((a, b) => {
      switch (searchFilters.sortBy) {
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'price': {
          const aPrice = parseFloat(a.price?.replace(/[^0-9.]/g, '') || '0');
          const bPrice = parseFloat(b.price?.replace(/[^0-9.]/g, '') || '0');
          return aPrice - bPrice;
        }
        default:
          return 0;
      }
    });

    setResults(filtered);
    setLoading(false);
  }, [mockResults]);

  useEffect(() => {
    if (query) {
      performSearch(query, filters);
    }
  }, [query, filters, performSearch]);

  const handleSearch = (searchQuery: string, searchFilters?: SearchFilters) => {
    setQuery(searchQuery);
    if (searchFilters) {
      setFilters(searchFilters);
    }
  };

  const toggleLike = (resultId: string) => {
    setResults(prev => prev.map(result =>
      result.id === resultId ? { ...result, isLiked: !result.isLiked } : result
    ));
  };

  const ResultCard: React.FC<{ result: SearchResult }> = ({ result }) => {
    const isGridView = viewMode === 'grid';
    
    return (
      <div className={cn(
        "bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200",
        isGridView ? "flex flex-col" : "flex flex-row"
      )}>
        <div className={cn(
          "relative",
          isGridView ? "h-48 w-full" : "h-48 w-72 flex-shrink-0"
        )}>
          <img
            src={result.image}
            alt={result.title}
            className="w-full h-full object-cover"
          />
          <button
            onClick={() => toggleLike(result.id)}
            className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white transition-colors"
          >
            <Heart className={cn(
              "w-4 h-4",
              result.isLiked ? "text-red-500 fill-current" : "text-gray-600"
            )} />
          </button>
          
          {result.category && (
            <span className="absolute top-3 left-3 px-2 py-1 bg-black/60 text-white text-xs font-medium rounded">
              {result.category}
            </span>
          )}
        </div>

        <div className={cn(
          "p-4 flex-1",
          !isGridView && "flex flex-col justify-between"
        )}>
          <div>
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg mb-1 line-clamp-1">
                  {result.title}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  {result.subtitle}
                </p>
              </div>
              
              {result.price && (
                <div className="text-right ml-4">
                  <p className="font-semibold text-lg text-green-600">
                    {result.price}
                  </p>
                </div>
              )}
            </div>

            <p className={cn(
              "text-gray-700 text-sm mb-3",
              isGridView ? "line-clamp-2" : "line-clamp-3"
            )}>
              {result.description}
            </p>

            <div className="flex items-center space-x-4 mb-3">
              <div className="flex items-center space-x-1 text-gray-600">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{result.location}</span>
              </div>
              
              {result.rating && (
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium">{result.rating}</span>
                  {result.reviewCount && (
                    <span className="text-sm text-gray-600">
                      ({result.reviewCount})
                    </span>
                  )}
                </div>
              )}
            </div>

            {result.amenities && (
              <div className="flex flex-wrap gap-1 mb-3">
                {result.amenities.slice(0, 4).map((amenity, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                  >
                    {amenity}
                  </span>
                ))}
                {result.amenities.length > 4 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                    +{result.amenities.length - 4} more
                  </span>
                )}
              </div>
            )}

            {result.highlights && (
              <div className="flex flex-wrap gap-1 mb-3">
                {result.highlights.slice(0, 3).map((highlight, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-4">
            {result.host && (
              <div className="flex items-center space-x-2">
                <img
                  src={result.host.avatar}
                  alt={result.host.name}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-sm text-gray-600">
                  {result.host.name}
                </span>
                {result.host.isSuperhost && (
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                    Superhost
                  </span>
                )}
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <button className="p-1 text-gray-400 hover:text-gray-600">
                <Share2 className="w-4 h-4" />
              </button>
              <Link
                to={`/${result.type}/${result.id}`}
                className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
              >
                View Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <AdvancedSearchInput
              placeholder="Search destinations, properties, or people..."
              onSearch={handleSearch}
              showSuggestions={true}
              showFilters={true}
              className="mb-4"
            />
            
            {query && (
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-gray-900">
                  Search results for "{query}"
                </h1>
                <p className="text-sm text-gray-600">
                  {loading ? 'Searching...' : `${results.length} results found`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2 border rounded-lg",
                  showFilters
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                )}
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-2 rounded-lg",
                  viewMode === 'grid'
                    ? "bg-primary-100 text-primary-700"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                )}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-2 rounded-lg",
                  viewMode === 'list'
                    ? "bg-primary-100 text-primary-700"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                )}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
          ) : results.length > 0 ? (
            <div className={cn(
              "grid gap-6",
              viewMode === 'grid'
                ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                : "grid-cols-1"
            )}>
              {results.map((result) => (
                <ResultCard key={result.id} result={result} />
              ))}
            </div>
          ) : query ? (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No results found
                </h3>
                <p className="text-gray-600 mb-4">
                  We couldn't find any results for "{query}". Try adjusting your search or filters.
                </p>
                <button
                  onClick={() => setQuery('')}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Clear search
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Start your search
                </h3>
                <p className="text-gray-600">
                  Enter a destination, property name, or search for people to get started.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchResultsPage;

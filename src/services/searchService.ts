// Temporarily simplified search service
// Will be re-enabled with proper types in future iteration

export interface SearchResult {
  id: string;
  type: 'property' | 'user' | 'location';
  title: string;
  description: string;
  location: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  rating?: number;
  reviewCount?: number;
  price?: {
    amount: number;
    currency: string;
    period: string;
  };
  images: string[];
  host?: {
    name: string;
    avatar: string;
    verified: boolean;
    responseRate: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchFilters {
  type?: 'all' | 'property' | 'user' | 'location';
  priceRange?: {
    min: number;
    max: number;
  };
  location?: {
    lat: number;
    lng: number;
    radius: number;
  };
  rating?: number;
  verified?: boolean;
  amenities?: string[];
  propertyType?: string[];
  dates?: {
    checkIn: Date;
    checkOut: Date;
  };
  guests?: number;
  sortBy?: 'relevance' | 'price' | 'rating' | 'distance' | 'recent';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchHistory {
  id: string;
  userId: string;
  query: string;
  filters: SearchFilters;
  results: number;
  timestamp: Date;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  query: string;
  filters: SearchFilters;
  notifications: boolean;
  createdAt: Date;
}

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'recent' | 'popular' | 'location' | 'property';
  count?: number;
  location?: {
    lat: number;
    lng: number;
  };
}

export class SearchService {
  // Mock implementation for now
  async searchAll(query: string, filters: SearchFilters = {}) {
    return { 
      properties: [] as SearchResult[], 
      users: [] as SearchResult[], 
      locations: [] as SearchResult[],
      total: 0,
      hasMore: false
    };
  }

  async searchProperties(query: string, filters: SearchFilters = {}) {
    return [] as SearchResult[];
  }

  async searchUsers(query: string, filters: SearchFilters = {}) {
    return [] as SearchResult[];
  }

  async searchLocations(query: string, filters: SearchFilters = {}) {
    return [] as SearchResult[];
  }

  async getSuggestions(query: string) {
    return [] as SearchSuggestion[];
  }

  async saveSearchHistory(userId: string, query: string, filters: SearchFilters, resultCount: number) {
    // Mock implementation
  }

  async getSearchHistory(userId: string) {
    return [] as SearchHistory[];
  }

  async saveFavoriteSearch(userId: string, name: string, query: string, filters: SearchFilters) {
    return 'mock-id';
  }

  async getSavedSearches(userId: string) {
    return [] as SavedSearch[];
  }

  async deleteSavedSearch(searchId: string) {
    // Mock implementation
  }

  async trackSearchInteraction(term: string) {
    // Mock implementation
  }

  async getPopularSearches() {
    return [] as string[];
  }

  async clearSearchHistory(userId: string) {
    // Mock implementation
  }
}

export const searchService = new SearchService();

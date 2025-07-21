import { 
  collection, 
  query as firestoreQuery, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  Timestamp,
  GeoPoint,
  or
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface SearchFilters {
  type?: 'all' | 'location' | 'property' | 'user';
  priceRange?: {
    min: number;
    max: number;
  };
  rating?: number;
  location?: string;
  checkIn?: Date;
  checkOut?: Date;
  guests?: number;
  amenities?: string[];
  propertyType?: string[];
  sortBy?: 'relevance' | 'price' | 'rating' | 'recent' | 'distance';
  coordinates?: {
    lat: number;
    lng: number;
  };
  radius?: number; // in kilometers
}

export interface SearchResult {
  id: string;
  type: 'location' | 'property' | 'user';
  title: string;
  description: string;
  location: string;
  coordinates?: GeoPoint;
  rating?: number;
  reviewCount?: number;
  price?: number;
  currency?: string;
  images: string[];
  amenities?: string[];
  propertyType?: string;
  host?: {
    id: string;
    name: string;
    avatar: string;
    verified: boolean;
    responseRate: number;
  };
  availability?: {
    available: boolean;
    minNights: number;
    maxNights: number;
    blockedDates: Date[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSearchHistory {
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

class SearchService {
  // Search properties with advanced filters
  async searchProperties(
    query: string, 
    filters: SearchFilters = {}, 
    limitResults: number = 50
  ): Promise<SearchResult[]> {
    try {
      const propertiesRef = collection(db, 'properties');
      const constraints = [];

      // Text search constraints
      if (query) {
        // For Firestore, we'll need to implement full-text search using array-contains
        // This requires storing searchable keywords in the document
        constraints.push(
          or(
            where('searchKeywords', 'array-contains-any', 
              query.toLowerCase().split(' ')),
            where('title', '>=', query),
            where('title', '<=', query + '\uf8ff')
          )
        );
      }

      // Type filter
      if (filters.type && filters.type !== 'all') {
        constraints.push(where('type', '==', filters.type));
      }

      // Price range filter
      if (filters.priceRange) {
        if (filters.priceRange.min > 0) {
          constraints.push(where('price', '>=', filters.priceRange.min));
        }
        if (filters.priceRange.max > 0) {
          constraints.push(where('price', '<=', filters.priceRange.max));
        }
      }

      // Rating filter
      if (filters.rating && filters.rating > 0) {
        constraints.push(where('rating', '>=', filters.rating));
      }

      // Property type filter
      if (filters.propertyType && filters.propertyType.length > 0) {
        constraints.push(where('propertyType', 'in', filters.propertyType));
      }

      // Amenities filter
      if (filters.amenities && filters.amenities.length > 0) {
        constraints.push(where('amenities', 'array-contains-any', filters.amenities));
      }

      // Guest capacity filter
      if (filters.guests && filters.guests > 0) {
        constraints.push(where('maxGuests', '>=', filters.guests));
      }

      // Availability filter (simplified - in real app, this would be more complex)
      if (filters.checkIn && filters.checkOut) {
        constraints.push(where('available', '==', true));
      }

      // Sorting
      let sortField = 'createdAt';
      let sortDirection: 'asc' | 'desc' = 'desc';

      switch (filters.sortBy) {
        case 'price':
          sortField = 'price';
          sortDirection = 'asc';
          break;
        case 'rating':
          sortField = 'rating';
          sortDirection = 'desc';
          break;
        case 'recent':
          sortField = 'createdAt';
          sortDirection = 'desc';
          break;
        default:
          sortField = 'createdAt';
          sortDirection = 'desc';
          break;
      }

      constraints.push(orderBy(sortField, sortDirection));
      constraints.push(limit(limitResults));

      const q = firestoreQuery(propertiesRef, ...constraints);
      const querySnapshot = await getDocs(q);

      const results: SearchResult[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        results.push({
          id: doc.id,
          type: data.type || 'property',
          title: data.title,
          description: data.description,
          location: data.location,
          coordinates: data.coordinates,
          rating: data.rating,
          reviewCount: data.reviewCount,
          price: data.price,
          currency: data.currency || 'USD',
          images: data.images || [],
          amenities: data.amenities || [],
          propertyType: data.propertyType,
          host: data.host,
          availability: data.availability,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      });

      return results;
    } catch (error) {
      console.error('Error searching properties:', error);
      throw error;
    }
  }

  // Search for locations
  async searchLocations(query: string, limitResults: number = 20): Promise<SearchResult[]> {
    try {
      const locationsRef = collection(db, 'locations');
      const q = query(
        locationsRef,
        or(
          where('name', '>=', query),
          where('name', '<=', query + '\uf8ff'),
          where('searchKeywords', 'array-contains-any', query.toLowerCase().split(' '))
        ),
        orderBy('popularity', 'desc'),
        limit(limitResults)
      );

      const querySnapshot = await getDocs(q);
      const results: SearchResult[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        results.push({
          id: doc.id,
          type: 'location',
          title: data.name,
          description: data.description,
          location: data.fullName || data.name,
          coordinates: data.coordinates,
          rating: data.rating,
          reviewCount: data.reviewCount,
          price: 0,
          currency: 'USD',
          images: data.images || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      });

      return results;
    } catch (error) {
      console.error('Error searching locations:', error);
      throw error;
    }
  }

  // Search for users/hosts
  async searchUsers(query: string, limitResults: number = 20): Promise<SearchResult[]> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        or(
          where('displayName', '>=', query),
          where('displayName', '<=', query + '\uf8ff'),
          where('bio', '>=', query),
          where('bio', '<=', query + '\uf8ff')
        ),
        where('isHost', '==', true),
        where('profileComplete', '==', true),
        orderBy('rating', 'desc'),
        limit(limitResults)
      );

      const querySnapshot = await getDocs(q);
      const results: SearchResult[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        results.push({
          id: doc.id,
          type: 'user',
          title: data.displayName,
          description: data.bio || '',
          location: data.location || '',
          coordinates: data.coordinates,
          rating: data.rating,
          reviewCount: data.reviewCount,
          price: 0,
          currency: 'USD',
          images: [data.photoURL || ''],
          host: {
            id: doc.id,
            name: data.displayName,
            avatar: data.photoURL || '',
            verified: data.verified || false,
            responseRate: data.responseRate || 0
          },
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      });

      return results;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  // Combined search across all types
  async search(
    query: string, 
    filters: SearchFilters = {}, 
    limitResults: number = 50
  ): Promise<SearchResult[]> {
    try {
      const results: SearchResult[] = [];

      // Search based on type filter
      if (!filters.type || filters.type === 'all') {
        // Search all types
        const [properties, locations, users] = await Promise.all([
          this.searchProperties(query, { ...filters, type: 'property' }, Math.floor(limitResults * 0.6)),
          this.searchLocations(query, Math.floor(limitResults * 0.2)),
          this.searchUsers(query, Math.floor(limitResults * 0.2))
        ]);
        
        results.push(...properties, ...locations, ...users);
      } else {
        // Search specific type
        switch (filters.type) {
          case 'property':
            results.push(...await this.searchProperties(query, filters, limitResults));
            break;
          case 'location':
            results.push(...await this.searchLocations(query, limitResults));
            break;
          case 'user':
            results.push(...await this.searchUsers(query, limitResults));
            break;
        }
      }

      // Sort combined results if needed
      if (filters.sortBy && filters.type === 'all') {
        results.sort((a, b) => {
          switch (filters.sortBy) {
            case 'rating':
              return (b.rating || 0) - (a.rating || 0);
            case 'price':
              return (a.price || 0) - (b.price || 0);
            case 'recent':
              return b.createdAt.getTime() - a.createdAt.getTime();
            default:
              return 0;
          }
        });
      }

      return results.slice(0, limitResults);
    } catch (error) {
      console.error('Error performing search:', error);
      throw error;
    }
  }

  // Get search suggestions
  async getSearchSuggestions(query: string, limitResults: number = 10): Promise<string[]> {
    try {
      if (query.length < 2) return [];

      const suggestionsRef = collection(db, 'searchSuggestions');
      const q = query(
        suggestionsRef,
        where('term', '>=', query.toLowerCase()),
        where('term', '<=', query.toLowerCase() + '\uf8ff'),
        orderBy('popularity', 'desc'),
        limit(limitResults)
      );

      const querySnapshot = await getDocs(q);
      const suggestions: string[] = [];

      querySnapshot.forEach((doc) => {
        suggestions.push(doc.data().term);
      });

      return suggestions;
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return [];
    }
  }

  // Save search history
  async saveSearchHistory(
    userId: string, 
    query: string, 
    filters: SearchFilters, 
    resultCount: number
  ): Promise<void> {
    try {
      const historyRef = collection(db, 'searchHistory');
      await addDoc(historyRef, {
        userId,
        query,
        filters,
        results: resultCount,
        timestamp: Timestamp.now()
      });
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  }

  // Get user's search history
  async getSearchHistory(userId: string, limitResults: number = 20): Promise<UserSearchHistory[]> {
    try {
      const historyRef = collection(db, 'searchHistory');
      const q = query(
        historyRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitResults)
      );

      const querySnapshot = await getDocs(q);
      const history: UserSearchHistory[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        history.push({
          id: doc.id,
          userId: data.userId,
          query: data.query,
          filters: data.filters,
          results: data.results,
          timestamp: data.timestamp.toDate()
        });
      });

      return history;
    } catch (error) {
      console.error('Error getting search history:', error);
      return [];
    }
  }

  // Save a search for later
  async saveSearch(
    userId: string, 
    name: string, 
    query: string, 
    filters: SearchFilters
  ): Promise<string> {
    try {
      const savedSearchRef = collection(db, 'savedSearches');
      const docRef = await addDoc(savedSearchRef, {
        userId,
        name,
        query,
        filters,
        notifications: false,
        createdAt: Timestamp.now()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error saving search:', error);
      throw error;
    }
  }

  // Get user's saved searches
  async getSavedSearches(userId: string): Promise<SavedSearch[]> {
    try {
      const savedSearchRef = collection(db, 'savedSearches');
      const q = query(
        savedSearchRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const savedSearches: SavedSearch[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        savedSearches.push({
          id: doc.id,
          userId: data.userId,
          name: data.name,
          query: data.query,
          filters: data.filters,
          notifications: data.notifications,
          createdAt: data.createdAt.toDate()
        });
      });

      return savedSearches;
    } catch (error) {
      console.error('Error getting saved searches:', error);
      return [];
    }
  }

  // Delete a saved search
  async deleteSavedSearch(searchId: string): Promise<void> {
    try {
      const searchRef = doc(db, 'savedSearches', searchId);
      await deleteDoc(searchRef);
    } catch (error) {
      console.error('Error deleting saved search:', error);
      throw error;
    }
  }

  // Update search suggestion popularity
  async updateSearchPopularity(query: string): Promise<void> {
    try {
      const term = query.toLowerCase().trim();
      if (!term) return;

      const suggestionsRef = collection(db, 'searchSuggestions');
      const q = query(suggestionsRef, where('term', '==', term));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Create new suggestion
        await addDoc(suggestionsRef, {
          term,
          popularity: 1,
          createdAt: Timestamp.now()
        });
      } else {
        // Update existing suggestion
        querySnapshot.forEach(async (docSnapshot) => {
          const docRef = doc(db, 'searchSuggestions', docSnapshot.id);
          await updateDoc(docRef, {
            popularity: (docSnapshot.data().popularity || 0) + 1
          });
        });
      }
    } catch (error) {
      console.error('Error updating search popularity:', error);
    }
  }

  // Get popular searches
  async getPopularSearches(limitResults: number = 10): Promise<string[]> {
    try {
      const suggestionsRef = collection(db, 'searchSuggestions');
      const q = query(
        suggestionsRef,
        orderBy('popularity', 'desc'),
        limit(limitResults)
      );

      const querySnapshot = await getDocs(q);
      const popularSearches: string[] = [];

      querySnapshot.forEach((doc) => {
        popularSearches.push(doc.data().term);
      });

      return popularSearches;
    } catch (error) {
      console.error('Error getting popular searches:', error);
      return [];
    }
  }
}

export const searchService = new SearchService();

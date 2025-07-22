import { useCallback, useRef, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  fetchExploreUsers,
  fetchUserFollowers,
  fetchUserFollowing,
  followUser,
  unfollowUser,
  checkFollowingStatuses
} from '@/store/slices/socialSlice';

interface UseOptimizedSocialAPIOptions {
  enableCaching?: boolean;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
}

interface UseOptimizedSocialAPIReturn {
  // Data fetching
  fetchUsers: (options?: { loadMore?: boolean }) => Promise<void>;
  fetchFollowers: (userId: string) => Promise<void>;
  fetchFollowing: (userId: string) => Promise<void>;
  
  // Social actions
  handleFollow: (targetUserId: string) => Promise<void>;
  handleUnfollow: (targetUserId: string) => Promise<void>;
  checkFollowStatus: (userIds: string[]) => Promise<void>;
  
  // Cache management
  invalidateCache: () => void;
  prefetchUser: (userId: string) => Promise<void>;
  
  // Status indicators
  isLoading: boolean;
  error: string | null;
  cacheStatus: Record<string, 'fresh' | 'stale' | 'empty'>;
}

export const useOptimizedSocialAPI = (
  currentUserId?: string,
  options: UseOptimizedSocialAPIOptions = {}
): UseOptimizedSocialAPIReturn => {
  const {
    enableCaching = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus = true,
    refetchOnReconnect = true
  } = options;

  const dispatch = useAppDispatch();
  
  // Selectors
  const isLoading = useAppSelector(state => 
    state.social.isLoading || state.social.exploreLoading
  );
  const error = useAppSelector(state => 
    state.social.error || state.social.exploreError
  );

  // Refs for optimization
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchRef = useRef<Record<string, number>>({});
  const pendingRequestsRef = useRef<Set<string>>(new Set());

  // Cache status tracking
  const cacheStatus = useMemo(() => {
    const status: Record<string, 'fresh' | 'stale' | 'empty'> = {};
    
    ['exploreUsers', 'followers', 'following'].forEach(key => {
      const lastFetch = lastFetchRef.current[key];
      if (!lastFetch) {
        status[key] = 'empty';
      } else {
        const isStale = (Date.now() - lastFetch) > staleTime;
        status[key] = isStale ? 'stale' : 'fresh';
      }
    });
    
    return status;
  }, [staleTime]);

  // Optimized fetch functions
  const fetchUsers = useCallback(async (options: { loadMore?: boolean } = {}) => {
    const requestKey = `fetchUsers_${currentUserId}_${options.loadMore}`;
    
    // Prevent duplicate requests
    if (pendingRequestsRef.current.has(requestKey)) {
      return;
    }

    // Check cache if enabled and not loading more
    if (enableCaching && !options.loadMore) {
      const lastFetch = lastFetchRef.current['exploreUsers'];
      if (lastFetch && (Date.now() - lastFetch) < staleTime) {
        return; // Use cached data
      }
    }

    pendingRequestsRef.current.add(requestKey);

    try {
      await dispatch(fetchExploreUsers({
        currentUserId,
        isLoadMore: options.loadMore || false
      })).unwrap();

      // Update cache timestamp
      if (enableCaching) {
        lastFetchRef.current['exploreUsers'] = Date.now();
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    } finally {
      pendingRequestsRef.current.delete(requestKey);
    }
  }, [dispatch, currentUserId, enableCaching, staleTime]);

  const fetchFollowers = useCallback(async (userId: string) => {
    const requestKey = `fetchFollowers_${userId}`;
    
    if (pendingRequestsRef.current.has(requestKey)) {
      return;
    }

    // Check cache
    if (enableCaching) {
      const lastFetch = lastFetchRef.current[requestKey];
      if (lastFetch && (Date.now() - lastFetch) < staleTime) {
        return;
      }
    }

    pendingRequestsRef.current.add(requestKey);

    try {
      await dispatch(fetchUserFollowers({ userId })).unwrap();

      if (enableCaching) {
        lastFetchRef.current[requestKey] = Date.now();
      }
    } catch (error) {
      console.error('Error fetching followers:', error);
      throw error;
    } finally {
      pendingRequestsRef.current.delete(requestKey);
    }
  }, [dispatch, enableCaching, staleTime]);

  const fetchFollowing = useCallback(async (userId: string) => {
    const requestKey = `fetchFollowing_${userId}`;
    
    if (pendingRequestsRef.current.has(requestKey)) {
      return;
    }

    // Check cache
    if (enableCaching) {
      const lastFetch = lastFetchRef.current[requestKey];
      if (lastFetch && (Date.now() - lastFetch) < staleTime) {
        return;
      }
    }

    pendingRequestsRef.current.add(requestKey);

    try {
      await dispatch(fetchUserFollowing({ userId })).unwrap();

      if (enableCaching) {
        lastFetchRef.current[requestKey] = Date.now();
      }
    } catch (error) {
      console.error('Error fetching following:', error);
      throw error;
    } finally {
      pendingRequestsRef.current.delete(requestKey);
    }
  }, [dispatch, enableCaching, staleTime]);

  // Optimistic social actions
  const handleFollow = useCallback(async (targetUserId: string) => {
    if (!currentUserId) return;

    const requestKey = `follow_${currentUserId}_${targetUserId}`;
    
    if (pendingRequestsRef.current.has(requestKey)) {
      return;
    }

    pendingRequestsRef.current.add(requestKey);

    try {
      await dispatch(followUser({
        currentUserId,
        targetUserId
      })).unwrap();

      // Invalidate related cache entries
      if (enableCaching) {
        delete lastFetchRef.current[`fetchFollowing_${currentUserId}`];
        delete lastFetchRef.current[`fetchFollowers_${targetUserId}`];
      }
    } catch (error) {
      console.error('Error following user:', error);
      throw error;
    } finally {
      pendingRequestsRef.current.delete(requestKey);
    }
  }, [dispatch, currentUserId, enableCaching]);

  const handleUnfollow = useCallback(async (targetUserId: string) => {
    if (!currentUserId) return;

    const requestKey = `unfollow_${currentUserId}_${targetUserId}`;
    
    if (pendingRequestsRef.current.has(requestKey)) {
      return;
    }

    pendingRequestsRef.current.add(requestKey);

    try {
      await dispatch(unfollowUser({
        currentUserId,
        targetUserId
      })).unwrap();

      // Invalidate related cache entries
      if (enableCaching) {
        delete lastFetchRef.current[`fetchFollowing_${currentUserId}`];
        delete lastFetchRef.current[`fetchFollowers_${targetUserId}`];
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
      throw error;
    } finally {
      pendingRequestsRef.current.delete(requestKey);
    }
  }, [dispatch, currentUserId, enableCaching]);

  // Batch follow status checking
  const checkFollowStatus = useCallback(async (userIds: string[]) => {
    if (!currentUserId || userIds.length === 0) return;

    const requestKey = `checkStatus_${currentUserId}_${userIds.join(',')}`;
    
    if (pendingRequestsRef.current.has(requestKey)) {
      return;
    }

    pendingRequestsRef.current.add(requestKey);

    try {
      await dispatch(checkFollowingStatuses({
        currentUserId,
        userIds
      })).unwrap();
    } catch (error) {
      console.error('Error checking follow status:', error);
      throw error;
    } finally {
      pendingRequestsRef.current.delete(requestKey);
    }
  }, [dispatch, currentUserId]);

  // Cache management
  const invalidateCache = useCallback(() => {
    lastFetchRef.current = {};
  }, []);

  // Prefetch optimization
  const prefetchUser = useCallback(async (userId: string) => {
    const promises: Promise<void>[] = [];
    
    const followersKey = `fetchFollowers_${userId}`;
    const followingKey = `fetchFollowing_${userId}`;
    
    // Only prefetch if not in cache
    if (!lastFetchRef.current[followersKey]) {
      promises.push(fetchFollowers(userId));
    }
    
    if (!lastFetchRef.current[followingKey]) {
      promises.push(fetchFollowing(userId));
    }
    
    await Promise.allSettled(promises);
  }, [fetchFollowers, fetchFollowing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel pending requests
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
        abortControllerRef.current.abort();
      }
      
      // Clear pending request tracking
      const pendingRequests = pendingRequestsRef.current;
      pendingRequests.clear();
    };
  }, []);

  return {
    // Data fetching
    fetchUsers,
    fetchFollowers,
    fetchFollowing,
    
    // Social actions
    handleFollow,
    handleUnfollow,
    checkFollowStatus,
    
    // Cache management
    invalidateCache,
    prefetchUser,
    
    // Status indicators
    isLoading,
    error,
    cacheStatus,
  };
};

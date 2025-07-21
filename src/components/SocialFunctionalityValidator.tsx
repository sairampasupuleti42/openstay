import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { socialService } from '@/modules/social/services/socialService';
import { messagingService } from '@/modules/messaging/services/messagingService';
import { userService } from '@/services/userServiceEnhanced';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: unknown;
}

const SocialFunctionalityValidator: React.FC = () => {
  const { currentUser } = useAuth();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testUserId, setTestUserId] = useState<string>('');

  const addResult = (result: TestResult) => {
    setTestResults(prev => {
      const existing = prev.find(r => r.name === result.name);
      if (existing) {
        return prev.map(r => r.name === result.name ? result : r);
      }
      return [...prev, result];
    });
  };

  const runTests = async () => {
    if (!currentUser) {
      alert('Please sign in first');
      return;
    }

    if (!testUserId.trim()) {
      alert('Please enter a test user ID');
      return;
    }

    setIsRunning(true);
    setTestResults([]);

    // Test 1: Authentication Status
    addResult({
      name: 'Authentication Status',
      status: 'pending',
      message: 'Checking authentication...'
    });

    try {
      const userProfile = await userService.getUserProfile(currentUser.uid);
      addResult({
        name: 'Authentication Status',
        status: userProfile ? 'success' : 'error',
        message: userProfile 
          ? `Authenticated as ${userProfile.displayName}` 
          : 'User profile not found',
        details: userProfile
      });
    } catch (error) {
      addResult({
        name: 'Authentication Status',
        status: 'error',
        message: `Authentication error: ${error.message}`,
        details: error
      });
    }

    // Test 2: Test User Profile Fetch
    addResult({
      name: 'Test User Profile',
      status: 'pending',
      message: 'Fetching test user profile...'
    });

    try {
      const testUser = await userService.getUserProfile(testUserId);
      addResult({
        name: 'Test User Profile',
        status: testUser ? 'success' : 'error',
        message: testUser 
          ? `Found test user: ${testUser.displayName}` 
          : 'Test user not found',
        details: testUser
      });
    } catch (error) {
      addResult({
        name: 'Test User Profile',
        status: 'error',
        message: `Error fetching test user: ${error.message}`,
        details: error
      });
    }

    // Test 3: Check Following Status
    addResult({
      name: 'Following Status Check',
      status: 'pending',
      message: 'Checking if following test user...'
    });

    try {
      const isFollowing = await socialService.isFollowing(currentUser.uid, testUserId);
      addResult({
        name: 'Following Status Check',
        status: 'success',
        message: `Following status: ${isFollowing ? 'Following' : 'Not following'}`,
        details: { isFollowing }
      });
    } catch (error) {
      addResult({
        name: 'Following Status Check',
        status: 'error',
        message: `Error checking following status: ${error.message}`,
        details: error
      });
    }

    // Test 4: Follow User
    addResult({
      name: 'Follow User Test',
      status: 'pending',
      message: 'Attempting to follow test user...'
    });

    try {
      await socialService.followUser(currentUser.uid, testUserId);
      const isNowFollowing = await socialService.isFollowing(currentUser.uid, testUserId);
      addResult({
        name: 'Follow User Test',
        status: isNowFollowing ? 'success' : 'error',
        message: isNowFollowing 
          ? 'Successfully followed user' 
          : 'Follow operation failed - status not updated',
        details: { isNowFollowing }
      });
    } catch (error) {
      addResult({
        name: 'Follow User Test',
        status: 'error',
        message: `Error following user: ${error.message}`,
        details: error
      });
    }

    // Test 5: Unfollow User
    addResult({
      name: 'Unfollow User Test',
      status: 'pending',
      message: 'Attempting to unfollow test user...'
    });

    try {
      await socialService.unfollowUser(currentUser.uid, testUserId);
      const isStillFollowing = await socialService.isFollowing(currentUser.uid, testUserId);
      addResult({
        name: 'Unfollow User Test',
        status: !isStillFollowing ? 'success' : 'error',
        message: !isStillFollowing 
          ? 'Successfully unfollowed user' 
          : 'Unfollow operation failed - status not updated',
        details: { isStillFollowing }
      });
    } catch (error) {
      addResult({
        name: 'Unfollow User Test',
        status: 'error',
        message: `Error unfollowing user: ${error.message}`,
        details: error
      });
    }

    // Test 6: Messaging Permission Check
    addResult({
      name: 'Messaging Permission Check',
      status: 'pending',
      message: 'Checking messaging permissions...'
    });

    try {
      // First follow both users for messaging test
      await socialService.followUser(currentUser.uid, testUserId);
      await socialService.followUser(testUserId, currentUser.uid);
      
      const user1FollowsUser2 = await socialService.isFollowing(currentUser.uid, testUserId);
      const user2FollowsUser1 = await socialService.isFollowing(testUserId, currentUser.uid);
      
      const canMessage = user1FollowsUser2 && user2FollowsUser1;
      
      addResult({
        name: 'Messaging Permission Check',
        status: canMessage ? 'success' : 'error',
        message: canMessage 
          ? 'Mutual following detected - messaging allowed' 
          : 'Mutual following required for messaging',
        details: { 
          user1FollowsUser2, 
          user2FollowsUser1, 
          canMessage 
        }
      });
    } catch (error) {
      addResult({
        name: 'Messaging Permission Check',
        status: 'error',
        message: `Error checking messaging permissions: ${error.message}`,
        details: error
      });
    }

    // Test 7: Create Conversation
    addResult({
      name: 'Create Conversation Test',
      status: 'pending',
      message: 'Attempting to create conversation...'
    });

    try {
      const conversationId = await messagingService.createConversation([currentUser.uid, testUserId]);
      addResult({
        name: 'Create Conversation Test',
        status: conversationId ? 'success' : 'error',
        message: conversationId 
          ? `Conversation created successfully: ${conversationId}` 
          : 'Failed to create conversation',
        details: { conversationId }
      });
    } catch (error) {
      addResult({
        name: 'Create Conversation Test',
        status: 'error',
        message: `Error creating conversation: ${error.message}`,
        details: error
      });
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Social Functionality Validator</h1>
          <p className="text-gray-600 mt-2">
            Test follow, unfollow, and messaging functionality
          </p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test User ID (enter another user's UID to test with)
              </label>
              <input
                type="text"
                value={testUserId}
                onChange={(e) => setTestUserId(e.target.value)}
                placeholder="Enter user ID to test with..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isRunning}
              />
            </div>

            <Button 
              onClick={runTests}
              disabled={isRunning || !currentUser || !testUserId.trim()}
              className="w-full"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                'Run Validation Tests'
              )}
            </Button>

            {/* Test Results */}
            {testResults.length > 0 && (
              <div className="space-y-3 mt-6">
                <h3 className="text-lg font-semibold">Test Results</h3>
                {testResults.map((result, index) => (
                  <div 
                    key={index}
                    className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                  >
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{result.name}</h4>
                      <p className="text-sm text-gray-600">{result.message}</p>
                      {result.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-primary-600 cursor-pointer">
                            Show Details
                          </summary>
                          <pre className="text-xs bg-white p-2 rounded border mt-1 overflow-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialFunctionalityValidator;

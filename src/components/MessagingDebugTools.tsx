import React, { useState } from 'react';
import { messagingService } from '@/modules/messaging/services/messagingService';
import { socialService } from '@/modules/social/services/socialService';
import { useAuth } from '@/contexts/AuthContext';

interface DebugResults {
  currentUserFollowsTarget?: boolean;
  targetFollowsCurrentUser?: boolean;
  mutualFollowCheck?: {
    user1FollowsUser2: boolean;
    user2FollowsUser1: boolean;
  };
  canCreateConversation?: boolean;
  currentRequirement?: boolean;
  error?: string;
}

const MessagingDebugTools: React.FC = () => {
  const { currentUser } = useAuth();
  const [targetUserId, setTargetUserId] = useState('');
  const [debugResults, setDebugResults] = useState<DebugResults | null>(null);
  const [loading, setLoading] = useState(false);

  const checkFollowStatus = async () => {
    if (!currentUser || !targetUserId) return;
    
    setLoading(true);
    try {
      // Check follow status using both services
      const socialServiceCheck = await socialService.isFollowing(currentUser.uid, targetUserId);
      const reverseCheck = await socialService.isFollowing(targetUserId, currentUser.uid);
      
      // Check using messaging service method
      const mutualFollowCheck = await messagingService.checkMutualFollow(currentUser.uid, targetUserId);
      
      const results = {
        currentUserFollowsTarget: socialServiceCheck,
        targetFollowsCurrentUser: reverseCheck,
        mutualFollowCheck,
        canCreateConversation: mutualFollowCheck.user1FollowsUser2 && mutualFollowCheck.user2FollowsUser1,
        currentRequirement: messagingService.getRequireMutualFollow()
      };
      
      setDebugResults(results);
      console.log('Follow status debug results:', results);
    } catch (error) {
      console.error('Error checking follow status:', error);
      setDebugResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const toggleMutualFollowRequirement = () => {
    const current = messagingService.getRequireMutualFollow();
    messagingService.setRequireMutualFollow(!current);
    alert(`Mutual follow requirement ${!current ? 'enabled' : 'disabled'}`);
  };

  const testCreateConversation = async () => {
    if (!currentUser || !targetUserId) return;
    
    setLoading(true);
    try {
      const conversationId = await messagingService.createConversation([currentUser.uid, targetUserId]);
      alert(`Conversation created successfully! ID: ${conversationId}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert(`Failed to create conversation: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return <div className="p-4 border border-gray-300 rounded">Please log in to use debug tools</div>;
  }

  return (
    <div className="p-4 border border-gray-300 rounded bg-gray-50 mb-4">
      <h3 className="font-bold mb-4">Messaging Debug Tools</h3>
      
      <div className="mb-4">
        <label className="block mb-2">Target User ID:</label>
        <input
          type="text"
          value={targetUserId}
          onChange={(e) => setTargetUserId(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
          placeholder="Enter user ID to test with"
        />
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={checkFollowStatus}
          disabled={loading || !targetUserId}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Check Follow Status'}
        </button>
        
        <button
          onClick={testCreateConversation}
          disabled={loading || !targetUserId}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Test Create Conversation'}
        </button>
        
        <button
          onClick={toggleMutualFollowRequirement}
          className="px-4 py-2 bg-yellow-500 text-white rounded"
        >
          Toggle Mutual Follow Requirement
        </button>
      </div>

      {debugResults && (
        <div className="mt-4 p-3 bg-white border border-gray-300 rounded">
          <h4 className="font-semibold mb-2">Debug Results:</h4>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(debugResults, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default MessagingDebugTools;

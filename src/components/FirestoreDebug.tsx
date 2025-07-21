import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { testFirestoreConnection, testUserDocumentCreation } from '@/utils/firestoreTest';

const FirestoreDebug: React.FC = () => {
  const { currentUser } = useAuth();
  const [testResults, setTestResults] = useState<string[]>([]);

  const runTests = async () => {
    setTestResults(['Running tests...']);
    
    const results: string[] = [];
    
    // Test basic connection
    const connectionTest = await testFirestoreConnection();
    results.push(`Connection test: ${connectionTest ? 'PASSED' : 'FAILED'}`);
    
    // Test user document creation
    const userDocTest = await testUserDocumentCreation();
    results.push(`User document test: ${userDocTest ? 'PASSED' : 'FAILED'}`);
    
    results.push(`Current user: ${currentUser?.uid || 'None'}`);
    results.push(`User email: ${currentUser?.email || 'None'}`);
    results.push(`Email verified: ${currentUser?.emailVerified || false}`);
    
    setTestResults(results);
  };

  if (!currentUser) {
    return (
      <div className="p-4 bg-yellow-100 border border-yellow-400 rounded">
        <p>Please sign in to test Firestore connection</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded">
      <h3 className="font-bold mb-2">Firestore Debug</h3>
      <button 
        onClick={runTests}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Run Firestore Tests
      </button>
      
      {testResults.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold">Test Results:</h4>
          <ul className="list-disc pl-5 space-y-1">
            {testResults.map((result, index) => (
              <li key={index} className="text-sm">{result}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FirestoreDebug;

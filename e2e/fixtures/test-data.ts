// Test data for E2E tests
export const testData = {
  users: {
    testUser: {
      email: 'test@openstay.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      displayName: 'Test User',
      bio: 'I love traveling and meeting new people!',
      location: 'San Francisco, CA',
      occupation: 'Software Engineer',
      interests: ['Travel', 'Technology', 'Photography']
    },
    secondUser: {
      email: 'test2@openstay.com',
      password: 'TestPassword123!',
      firstName: 'Jane',
      lastName: 'Smith',
      displayName: 'Jane Smith'
    }
  },
  
  contact: {
    validForm: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      subject: 'Test Contact Form',
      message: 'This is a test message from the E2E automation suite.'
    },
    invalidForm: {
      name: 'A', // Too short
      email: 'invalid-email',
      subject: 'Hi', // Too short
      message: 'Short' // Too short
    }
  },
  
  search: {
    queries: [
      'Paris',
      'Tokyo',
      'Travel',
      'Host',
      'Community'
    ],
    filters: {
      type: 'location',
      priceRange: 'mid-range',
      rating: 4
    }
  },
  
  incident: {
    validReport: {
      title: 'Test Security Incident',
      description: 'This is a test incident report created by the E2E automation suite. Please ignore this report.',
      type: 'technical',
      severity: 'low',
      priority: 'low',
      category: 'platform_security',
      contactEmail: 'test@openstay.com'
    }
  }
};

// Helper functions for test data
export const generateRandomEmail = () => {
  const timestamp = Date.now();
  return `test${timestamp}@openstay.com`;
};

export const generateRandomUser = () => {
  const timestamp = Date.now();
  return {
    email: generateRandomEmail(),
    password: 'TestPassword123!',
    firstName: `Test${timestamp}`,
    lastName: 'User',
    displayName: `Test${timestamp} User`
  };
};
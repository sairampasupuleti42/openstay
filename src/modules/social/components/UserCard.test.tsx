import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import UserCard from '@/modules/social/components/UserCard';
import socialSlice from '@/store/slices/socialSlice';

// Mock the social service
jest.mock('@/modules/social/services/socialService');

const createMockStore = () => {
  return configureStore({
    reducer: {
      social: socialSlice
    }
  });
};

const mockUser = {
  uid: 'user2',
  displayName: 'John Doe',
  email: 'john@example.com',
  photoURL: 'https://example.com/photo.jpg',
  location: 'New York',
  bio: 'Software developer',
  following: [],
  followers: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z'
};

describe('UserCard', () => {
  it('renders user information correctly', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <UserCard
          user={mockUser}
          currentUserId="user1"
          variant="grid"
          showActions={true}
        />
      </Provider>
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('New York')).toBeInTheDocument();
    expect(screen.getByText('Software developer')).toBeInTheDocument();
  });

  it('renders without crashing when showActions is false', () => {
    const store = createMockStore();
    
    render(
      <Provider store={store}>
        <UserCard
          user={mockUser}
          currentUserId="user1"
          variant="grid"
          showActions={false}
        />
      </Provider>
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders user initials when no photo URL', () => {
    const store = createMockStore();
    const userWithoutPhoto = { ...mockUser, photoURL: undefined };
    
    render(
      <Provider store={store}>
        <UserCard
          user={userWithoutPhoto}
          currentUserId="user1"
          variant="grid"
          showActions={false}
        />
      </Provider>
    );

    expect(screen.getByText('J')).toBeInTheDocument(); // First letter of displayName
  });
});

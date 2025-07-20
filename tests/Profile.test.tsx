import { render, screen } from '@testing-library/react';
import Profile from '../src/pages/Profile';

describe('Profile', () => {
  it('renders the profile page', () => {
    render(<Profile />);
    
    // Check if key elements are present
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });
});
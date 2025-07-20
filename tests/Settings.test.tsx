import { render, screen } from '@testing-library/react';
import Settings from '../src/pages/Settings';

describe('Settings', () => {
  it('renders the settings page', () => {
    render(<Settings />);
    
    // Check if key elements are present
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
    expect(screen.getByText('Active Sessions')).toBeInTheDocument();
  });
});
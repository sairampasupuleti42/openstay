import { render, screen } from '@testing-library/react';
import HomePage from '../src/pages/HomePage';
import React from 'react';

describe('HomePage', () => {
  test('renders the main heading', () => {
    render(<HomePage />);
    const headingElement = screen.getByRole('heading', { name: /Host or Travel with Openstay/i });
    expect(headingElement).toBeInTheDocument();
  });

  test('renders the call to action buttons', () => {
    render(<HomePage />);
    const learnMoreButton = screen.getByRole('link', { name: /Learn More About Us/i });
    const contactButton = screen.getByRole('link', { name: /contact/i });
    expect(learnMoreButton).toBeInTheDocument();
    expect(contactButton).toBeInTheDocument();
  });
});
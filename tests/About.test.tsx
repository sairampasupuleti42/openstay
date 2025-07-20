import { render, screen } from '@testing-library/react';
import About from '../src/pages/About';
import React from 'react';

describe('About Page', () => {
  test('renders the About Us heading', () => {
    render(<About />);
    const headingElement = screen.getByRole('heading', { name: /About Us/i });
    expect(headingElement).toBeInTheDocument();
  });

  test('renders the mission statement paragraph', () => {
    render(<About />);
    const missionStatement = screen.getByText(
      /Our mission is to connect people seeking authentic travel experiences with welcoming hosts around the world./i
    );
    expect(missionStatement).toBeInTheDocument();
  });

  test('renders the vision statement paragraph', () => {
    render(<About />);
    const visionStatement = screen.getByText(
      /We envision a world where travel is more than just visiting new places; it's about building connections, fostering cultural exchange, and creating lasting memories./i
    );
    expect(visionStatement).toBeInTheDocument();
  });
});
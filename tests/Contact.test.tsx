import { render, screen } from '@testing-library/react';
import Contact from '../src/pages/Contact';
import React from 'react';

describe('Contact Page', () => {
  test('renders the Contact Us heading', () => {
    render(<Contact />);
    const headingElement = screen.getByRole('heading', { name: /Contact Us/i });
    expect(headingElement).toBeInTheDocument();
  });

  test('renders the contact form with name, email, and message fields', () => {
    render(<Contact />);
    const nameInput = screen.getByLabelText(/Your Name/i);
    const emailInput = screen.getByLabelText(/Your Email/i);
    const messageTextarea = screen.getByLabelText(/Your Message/i);
    expect(nameInput).toBeInTheDocument();
    expect(emailInput).toBeInTheDocument();
    expect(messageTextarea).toBeInTheDocument();
  });

  test('renders the Send Message button', () => {
    render(<Contact />);
    const sendButton = screen.getByRole('button', { name: /Send Message/i });
    expect(sendButton).toBeInTheDocument();
  });
});
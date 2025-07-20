import { render, screen } from '@testing-library/react';
import SignUp from '../src/pages/auth/SignUp';

describe('SignUp', () => {
  it('renders the sign up page', () => {
    render(<SignUp />);
    
    // Check if key elements are present
    expect(screen.getByRole('heading', { name: /Sign Up/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign Up/i })).toBeInTheDocument();
  });
});
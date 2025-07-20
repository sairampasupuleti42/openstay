import { render, screen } from '@testing-library/react';
import SignIn from '../src/pages/auth/SingIn'; // Note: Corrected path to SingIn

describe('SignIn', () => {
  it('renders the sign in page', () => {
    render(<SignIn />);
    
    // Check if key elements are present
    expect(screen.getByRole('heading', { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });
});
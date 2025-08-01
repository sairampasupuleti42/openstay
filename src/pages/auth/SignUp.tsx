import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, User, Mail, Lock, CheckCircle, Users, Home } from 'lucide-react';
import { signUpSchema, type SignUpFormData } from '@/schemas/authSchemas';
import { signUpWithEmailPassword, signUpWithGoogle } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import Title from '@/helpers/Title';
import SEOMeta from '@/helpers/SEOMeta';

const SignUp: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, loading } = useAuth();
  const urlRole = searchParams.get('role') as 'traveler' | 'host' | null;

  // Redirect if user is already authenticated
  useEffect(() => {
    if (!loading && currentUser) {
      // User is already signed in, redirect to home page
      navigate('/', { replace: true });
    }
  }, [currentUser, loading, navigate]);

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: urlRole || 'traveler', // Default to traveler if no URL param
    },
  });

  // Update form role when URL parameter changes
  useEffect(() => {
    if (urlRole && (urlRole === 'traveler' || urlRole === 'host')) {
      form.setValue('role', urlRole);
    }
  }, [urlRole, form]);

  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await signUpWithEmailPassword(data);
      
      if (result.success) {
        setSuccess(result.message);
        setEmailSent(true);
        form.reset();
        
        // Redirect to onboarding page after 3 seconds
        setTimeout(() => {
          navigate('/onboarding', {
            state: { message: 'Account created! Let\'s complete your profile setup.' }
          });
        }, 3000);
      } else {
        setError(result.message);
      }
    } catch (error: unknown) {
      console.error('Sign up error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    setError('');
    setSuccess('');

    try {
      // Get the current role value from the form
      const currentRole = form.getValues('role');
      
      const result = await signUpWithGoogle(currentRole);
      
      if (result.success) {
        setSuccess('Account created with Google successfully!');
        // Redirect to onboarding page after successful sign up
        setTimeout(() => {
          navigate('/onboarding');
        }, 3000);
      } else {
        setError(result.message);
      }
    } catch (error: unknown) {
      console.error('Google sign up error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength =5;
    // if (/[A-Z]/.test(password)) strength++;
    // if (/[a-z]/.test(password)) strength++;
    // if (/\d/.test(password)) strength++;
    // if (/[@$!%*?&]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(form.watch('password') || '');
  const passwordsMatch = form.watch('password') === form.watch('confirmPassword') && form.watch('confirmPassword') !== '';

  // Show loading screen while checking authentication status
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (emailSent) {
    return (
      <>
        <SEOMeta
          title="Check Your Email - Openstay"
          description="Please check your email to verify your Openstay account."
          keywords="email verification, account confirmation, Openstay"
          canonicalUrl="/auth/signup"
        />
        
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <Title variant="gradient" className="text-3xl mb-2">
              Check Your Email
            </Title>
            <p className="text-muted-foreground">
              We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.
            </p>
          </div>

          <div className="bg-primary-50 border border-blue-200 rounded-md p-4 mb-6">
            <p className="text-sm text-primary-700">
              <strong>Didn't receive the email?</strong> Check your spam folder, or{' '}
              <button
                type="button"
                className="text-primary-600 hover:text-primary-800 underline"
                onClick={() => setEmailSent(false)}
              >
                try signing up again
              </button>
            </p>
          </div>

          <Button
            onClick={() => navigate('/onboarding')}
            className="w-full"
          >
            Continue to Profile Setup
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOMeta
        title="Sign Up - Openstay"
        description="Create your Openstay account and start connecting with local hosts for authentic travel experiences around the world."
        keywords="sign up, register, create account, Openstay registration"
        canonicalUrl="/auth/signup"
      />
      
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <Title variant="gradient" className="text-3xl mb-2">
            Join Openstay
          </Title>
          <p className="text-muted-foreground">
            Create your account to start your journey
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-primary-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Google Sign Up Button */}
        <Button
          type="button"
          variant="outline"
          className="w-full mb-6 h-12"
          onClick={handleGoogleSignUp}
          disabled={isGoogleLoading || isLoading}
        >
          {isGoogleLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
              Creating account with Google...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign up with Google as {form.watch('role') === 'host' ? 'Host' : 'Traveler'}
            </>
          )}
        </Button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-muted-foreground">Or continue with</span>
          </div>
        </div>

        {/* Sign Up Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-4 w-4 text-gray-400" />
                        </div>
                        <Input
                          placeholder="John"
                          className="pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-4 w-4 text-gray-400" />
                        </div>
                        <Input
                          placeholder="Doe"
                          className="pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Role Selection */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>I want to join as</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className={`relative flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        field.value === 'traveler' 
                          ? 'border-primary-500 bg-primary-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          value="traveler"
                          checked={field.value === 'traveler'}
                          onChange={field.onChange}
                          className="sr-only"
                        />
                        <div className="flex items-center space-x-3">
                          <Users className="h-6 w-6 text-primary-600" />
                          <div>
                            <div className="font-medium text-gray-900">Traveler</div>
                            <div className="text-sm text-gray-500">Find hosts and explore new places</div>
                          </div>
                        </div>
                        <div className={`absolute top-3 right-3 w-4 h-4 rounded-full border-2 ${
                          field.value === 'traveler' 
                            ? 'border-primary-500 bg-primary-500' 
                            : 'border-gray-300'
                        }`}>
                          {field.value === 'traveler' && (
                            <div className="w-full h-full rounded-full bg-white scale-50 transform"></div>
                          )}
                        </div>
                      </label>

                      <label className={`relative flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        field.value === 'host' 
                          ? 'border-primary-500 bg-primary-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          value="host"
                          checked={field.value === 'host'}
                          onChange={field.onChange}
                          className="sr-only"
                        />
                        <div className="flex items-center space-x-3">
                          <Home className="h-6 w-6 text-primary-600" />
                          <div>
                            <div className="font-medium text-gray-900">Host</div>
                            <div className="text-sm text-gray-500">Welcome travelers to your space</div>
                          </div>
                        </div>
                        <div className={`absolute top-3 right-3 w-4 h-4 rounded-full border-2 ${
                          field.value === 'host' 
                            ? 'border-primary-500 bg-primary-500' 
                            : 'border-gray-300'
                        }`}>
                          {field.value === 'host' && (
                            <div className="w-full h-full rounded-full bg-white scale-50 transform"></div>
                          )}
                        </div>
                      </label>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email Field */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        type="email"
                        placeholder="john.doe@example.com"
                        className="pl-10"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password Field */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a strong password"
                        className="pl-10 pr-10"
                        {...field}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  
                  {/* Password Strength Indicator */}
                  {field.value && (
                    <div className="mt-2">
                      <div className="flex items-center space-x-2 text-xs">
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              className={`h-1 w-4 rounded-full ${
                                i <= passwordStrength
                                  ? passwordStrength <= 2
                                    ? 'bg-red-400'
                                    : passwordStrength <= 3
                                    ? 'bg-yellow-400'
                                    : 'bg-green-400'
                                  : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span
                          className={`${
                            passwordStrength <= 2
                              ? 'text-red-600'
                              : passwordStrength <= 3
                              ? 'text-yellow-600'
                              : 'text-green-600'
                          }`}
                        >
                          {passwordStrength <= 2
                            ? 'Weak'
                            : passwordStrength <= 3
                            ? 'Medium'
                            : 'Strong'}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirm Password Field */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        className="pl-10 pr-10"
                        {...field}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  
                  {/* Password Match Indicator */}
                  {field.value && (
                    <div className="mt-2">
                      <div className={`text-xs ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                        {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                      </div>
                    </div>
                  )}
                  
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Terms and Conditions */}
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  required
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="terms" className="text-gray-600">
                  I agree to the{' '}
                  <Link to="/terms" className="text-primary hover:text-primary-500">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-primary hover:text-primary-500">
                    Privacy Policy
                  </Link>
                </label>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12"
              disabled={isLoading || isGoogleLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              to="/auth/signin"
              className="font-medium text-primary hover:text-primary-500"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default SignUp;

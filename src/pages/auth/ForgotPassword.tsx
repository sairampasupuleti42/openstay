import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, ArrowLeft } from 'lucide-react';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/schemas/authSchemas';
import { sendPasswordReset } from '@/services/authService';
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

const ForgotPassword: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await sendPasswordReset(data.email);
      
      if (result.success) {
        setSuccess(result.message);
        setEmailSent(true);
        form.reset();
      } else {
        setError(result.message);
      }
    } catch (error: unknown) {
      console.error('Password reset error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <>
        <SEOMeta
          title="Password Reset Email Sent - Openstay"
          description="Check your email for password reset instructions."
          keywords="password reset, forgot password, email sent"
          canonicalUrl="/auth/forgot-password"
        />
        
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <Mail className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <Title variant="gradient" className="text-3xl mb-2">
              Check Your Email
            </Title>
            <p className="text-muted-foreground">
              We've sent a password reset link to your email address. Please check your inbox and follow the instructions to reset your password.
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
                try again
              </button>
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => setEmailSent(false)}
              variant="outline"
              className="w-full"
            >
              Try Again
            </Button>
            <Link to="/auth/signin">
              <Button className="w-full">
                Back to Sign In
              </Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOMeta
        title="Forgot Password - Openstay"
        description="Reset your Openstay password. Enter your email address and we'll send you a link to reset your password."
        keywords="forgot password, password reset, Openstay password recovery"
        canonicalUrl="/auth/forgot-password"
      />
      
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <Title variant="gradient" className="text-3xl mb-2">
            Forgot Password?
          </Title>
          <p className="text-muted-foreground">
            Enter your email address and we'll send you a link to reset your password.
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
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Forgot Password Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        placeholder="Enter your email address"
                        className="pl-10"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-12"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending reset link...
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center">
          <Link
            to="/auth/signin"
            className="inline-flex items-center text-sm font-medium text-primary hover:text-primary-500"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </>
  );
};

export default ForgotPassword;

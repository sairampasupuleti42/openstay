import { z } from 'zod';

// Name validation with regex for first and last name combo
const nameRegex = /^[a-zA-Z]+(([',. -][a-zA-Z ])?[a-zA-Z]*)*$/;

// Password validation - at least 8 characters, one uppercase, one lowercase, one number
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Phone number validation (international format)
const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;

// Email validation schema
const emailSchema = z.string()
  .email('Please enter a valid email address')
  .min(1, 'Email is required');

// Password validation schema
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(passwordRegex, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');

// Name validation schema
const nameSchema = z.string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must not exceed 50 characters')
  .regex(nameRegex, 'Please enter a valid name (letters, spaces, hyphens, and apostrophes only)');

// Sign In Schema
export const signInSchema = z.object({
  emailOrPhone: z.string()
    .min(1, 'Email or phone number is required')
    .refine((value) => {
      // Check if it's a valid email or phone number
      const isEmail = z.string().email().safeParse(value).success;
      const isPhone = phoneRegex.test(value);
      return isEmail || isPhone;
    }, 'Please enter a valid email address or phone number'),
  password: z.string()
    .min(1, 'Password is required')
});

// Sign Up Schema
export const signUpSchema = z.object({
  firstName: nameSchema.refine((value) => value.trim().length > 0, 'First name is required'),
  lastName: nameSchema.refine((value) => value.trim().length > 0, 'Last name is required'),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string()
    .min(1, 'Please confirm your password')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Forgot Password Schema
export const forgotPasswordSchema = z.object({
  email: emailSchema
});

// Reset Password Schema
export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string()
    .min(1, 'Please confirm your password')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Types
export type SignInFormData = z.infer<typeof signInSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const ThemedButton: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  
  const variants = {
    primary: 'bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-200/50',
    secondary: 'bg-primary-100 hover:bg-primary-200 text-primary-800 border border-primary-200',
    outline: 'border-2 border-primary-500 text-primary-600 hover:bg-primary-50 hover:text-primary-700',
    ghost: 'text-primary-600 hover:bg-primary-100 hover:text-primary-700'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };
  
  return (
    <button
      className={cn(baseClasses, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
};

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'accent' | 'outline';
  className?: string;
}

export const ThemedCard: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className
}) => {
  const variants = {
    default: 'bg-white border border-gray-200 shadow-sm',
    accent: 'bg-primary-50 border border-primary-200 shadow-lg shadow-primary-100/50',
    outline: 'bg-white border-2 border-primary-500 shadow-lg shadow-primary-200/30'
  };
  
  return (
    <div className={cn('rounded-lg p-6', variants[variant], className)}>
      {children}
    </div>
  );
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
}

export const ThemedBadge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  className
}) => {
  const variants = {
    primary: 'bg-primary-500 text-white',
    secondary: 'bg-primary-100 text-primary-800',
    outline: 'border border-primary-500 text-primary-600 bg-white'
  };
  
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
};

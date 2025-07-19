import React from 'react';

interface TitleProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'gradient' | 'solid';
  id?: string;
}

const Title: React.FC<TitleProps> = ({ 
  children, 
  className = '', 
  size = 'md',
  variant = 'gradient',
  id
}) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl'
  };

  const variantClasses = {
    gradient: 'bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-primary/90',
    solid: 'text-primary-600'
  };

  return (
    <span className={`font-heading font-bold ${sizeClasses[size]} ${variantClasses[variant]} ${className}`} id={id}>
      {children}
    </span>
  );
};

export default Title;

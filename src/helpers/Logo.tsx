import React from 'react';

interface LogoProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  alt?: string;
}

const Logo: React.FC<LogoProps> = ({ 
  width = 240, 
  height = 60, 
  className = "",
  alt = "OpenStay Logo" 
}) => {
  return (
    <span className={`font-heading font-bold ${className}`}>
      <img 
        src="src/assets/logo/logo-primary.png" 
        alt={alt}
        width={width}
        height={height}
        style={{ width, height }}
      />
    </span>
  );
};

export default Logo;

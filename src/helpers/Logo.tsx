import React from 'react';
import logoImage from '../assets/logo/transparent/logo-primary.png';
import footerLogo from '../assets/logo/transparent/logo-primary.png';
interface LogoProps {
  at?: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  alt?: string;
}

const Logo: React.FC<LogoProps> = ({
  at =  logoImage,
  width = 240, 
  height = 60, 
  className = "",
  alt = "Openstay Logo" 
}) => {
  return (
    <span className={`font-heading font-bold ${className}`}>
      <img 
        src={at=== 'footer-logo' ? footerLogo: logoImage}
        alt={alt}
        width={width}
        height={height}
        style={{ width, height }}
      />
    </span>
  );
};

export default Logo;

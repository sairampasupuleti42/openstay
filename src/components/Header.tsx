import React, { useState } from "react";
import { cn } from "@/lib/utils";
import Logo from "@/helpers/Logo";

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header
      className="bg-white/95 backdrop-blur-sm border-b border-primary-200 sticky top-0 z-50"
      role="banner"
      aria-label="Site header"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <a
              href="/"
              className="flex items-center"
              aria-label="Openstay - Go to homepage"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 bg-primary-500 rounded-full mr-3">
                <span
                  className="text-lg font-bold text-white"
                  aria-hidden="true"
                >
                  O
                </span>
              </div>
              <Logo
                width={240}
                height={60}
                className="hover:opacity-80 transition-opacity"
                alt="OpenStay Company Logo"
              />
            </a>
          </div>

          {/* Desktop Navigation */}
          <nav
            className="hidden md:flex items-center space-x-8"
            role="navigation"
            aria-label="Main navigation"
          >
            <a
              href="#home"
              className="text-foreground hover:text-primary-600 transition-colors font-medium"
              aria-current="page"
            >
              Home
            </a>
            <a
              href="#about"
              className="text-foreground hover:text-primary-600 transition-colors font-medium"
            >
              About
            </a>
            <a
              href="#services"
              className="text-foreground hover:text-primary-600 transition-colors font-medium"
            >
              Services
            </a>
            <a
              href="#contact"
              className="text-foreground hover:text-primary-600 transition-colors font-medium"
            >
              Contact
            </a>
          </nav>

          {/* CTA Button */}
          <div className="hidden md:flex items-center space-x-4">
            <a
              href="mailto:sairampasupuleti.42@gmail.com"
              className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              aria-label="Send email to get in touch"
            >
              Get In Touch
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg text-foreground hover:bg-primary-100 transition-colors"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            aria-label="Toggle mobile navigation menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        <nav
          id="mobile-menu"
          className={cn(
            "md:hidden transition-all duration-300 ease-in-out overflow-hidden",
            isMenuOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
          )}
          aria-label="Mobile navigation"
          role="navigation"
        >
          <div className="py-4 space-y-4 border-t border-primary-200">
            <a
              href="#home"
              className="block text-foreground hover:text-primary-600 transition-colors font-medium"
            >
              Home
            </a>
            <a
              href="#about"
              className="block text-foreground hover:text-primary-600 transition-colors font-medium"
            >
              About
            </a>
            <a
              href="#services"
              className="block text-foreground hover:text-primary-600 transition-colors font-medium"
            >
              Services
            </a>
            <a
              href="#contact"
              className="block text-foreground hover:text-primary-600 transition-colors font-medium"
            >
              Contact
            </a>
            <a
              href="mailto:sairampasupuleti.42@gmail.com"
              className="inline-block bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              aria-label="Send email to get in touch"
            >
              Get In Touch
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;

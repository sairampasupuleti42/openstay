import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import Logo from "@/helpers/Logo";
import { useAuth } from "@/contexts/AuthContext";
import UserProfileDropdown from "@/components/UserProfileDropdown";
import SearchInput from "@/components/SearchInput";

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleSearch = (query: string) => {
    // Navigate to search results page
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

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
            <Link
              to="/"
              className="flex items-center"
              aria-label="Openstay - Go to homepage"
            >
              <Logo
                width={240}
                height={60}
                className="hover:opacity-80 transition-opacity"
                alt="OpenStay Company Logo"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav
            className="hidden md:flex items-center space-x-8"
            role="navigation"
            aria-label="Main navigation"
          >
            {!currentUser && (
              <>
                <Link
                  to="/auth/signup"
                  className="text-foreground hover:text-primary-600 transition-colors font-medium"
                >
                  Sign Up
                </Link>
                <Link
                  to="/auth/signin"
                  className="text-foreground hover:text-primary-600 transition-colors font-medium"
                >
                  Sign In
                </Link>
              </>
            )}
            {!currentUser ? (
              <>
                <Link
                  to="/"
                  onClick={scrollToTop}
                  className={cn(
                    "text-foreground hover:text-primary-600 transition-colors font-medium",
                    location.pathname === "/" &&
                      "text-primary-600 font-semibold"
                  )}
                >
                  Home
                </Link>
                <Link
                  to="/about"
                  onClick={scrollToTop}
                  className={cn(
                    "text-foreground hover:text-primary-600 transition-colors font-medium",
                    location.pathname === "/about" &&
                      "text-primary-600 font-semibold"
                  )}
                >
                  About
                </Link>

                <Link
                  to="/contact"
                  onClick={scrollToTop}
                  className={cn(
                    "text-foreground hover:text-primary-600 transition-colors font-medium",
                    location.pathname === "/contact" &&
                      "text-primary-600 font-semibold"
                  )}
                >
                  Contact
                </Link>
              </>
            ) : (
              <div className="flex-1 max-w-2xl mx-6">
                <SearchInput 
                  onSearch={handleSearch}
                  placeholder="Search destinations..."
                  className="w-full"
                />
              </div>
            )}
          </nav>

          {/* CTA Button / User Profile */}
          <div className="hidden md:flex items-center space-x-4">
            {loading ? (
              // Loading skeleton
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ) : currentUser ? (
              // Show user profile when logged in
              <UserProfileDropdown />
            ) : (
              // Show Sign In button when not logged in
              <Link
                to="/auth/signin"
                className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                aria-label="Sign in to your account"
              >
                Sign In
              </Link>
            )}
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
            {/* Mobile Search */}
            {currentUser && (
              <div className="px-2">
                <SearchInput 
                  onSearch={handleSearch}
                  placeholder="Search destinations..."
                  className="w-full"
                  isMobile={true}
                />
              </div>
            )}
            
            {!currentUser && (
              <>
                <Link
                  to="/"
                  className={cn(
                    "block text-foreground hover:text-primary-600 transition-colors font-medium",
                    location.pathname === "/" &&
                      "text-primary-600 font-semibold"
                  )}
                  onClick={() => {
                    setIsMenuOpen(false);
                    scrollToTop();
                  }}
                >
                  Home
                </Link>
                <Link
                  to="/about"
                  className={cn(
                    "block text-foreground hover:text-primary-600 transition-colors font-medium",
                    location.pathname === "/about" &&
                      "text-primary-600 font-semibold"
                  )}
                  onClick={() => {
                    setIsMenuOpen(false);
                    scrollToTop();
                  }}
                >
                  About
                </Link>
              </>
            )}

            <Link
              to="/contact"
              className={cn(
                "block text-foreground hover:text-primary-600 transition-colors font-medium",
                location.pathname === "/contact" &&
                  "text-primary-600 font-semibold"
              )}
              onClick={() => {
                setIsMenuOpen(false);
                scrollToTop();
              }}
            >
              Contact
            </Link>

            {/* Mobile Auth Section */}
            {loading ? (
              <div className="pt-4 border-t border-primary-200">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            ) : currentUser ? (
              <div className="pt-4 border-t border-primary-200">
                <UserProfileDropdown isMobile={true} />
              </div>
            ) : (
              <Link
                to="/auth/signin"
                className="inline-block bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium transition-colors mt-4"
                onClick={() => setIsMenuOpen(false)}
                aria-label="Sign in to your account"
              >
                Sign In
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;

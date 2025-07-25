import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Bell, MessageSquare, AlertTriangle, Users, UserCheck, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "@/helpers/Logo";
import { useAuth } from "@/contexts/AuthContext";
import UserProfileDropdown from "@/components/UserProfileDropdown";
import SearchInput from "@/components/SearchInput";

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();

  // Handle scroll effect for header background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  const handleSearch = useCallback((query: string) => {
    // Navigate to search results page
    navigate(`/search?q=${encodeURIComponent(query)}`);
  }, [navigate]);

  const toggleMobileMenu = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300 bg-white border-b border-gray-100",
        isScrolled && "shadow-md"
      )}
      role="banner"
      aria-label="Site header"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Link
              to="/"
              className="flex items-center group"
              aria-label="Educrat - Go to homepage"
              onClick={scrollToTop}
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-xl">E</span>
                </div>
                <span className="text-2xl font-bold text-gray-900">Educrat</span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav
            className="hidden lg:flex items-center space-x-8"
            role="navigation"
            aria-label="Main navigation"
          >
            <Link
              to="/explore"
              onClick={scrollToTop}
              className={cn(
                "text-gray-700 hover:text-purple-600 transition-colors duration-200 font-medium relative group",
                location.pathname === "/explore" && "text-purple-600"
              )}
              aria-current={location.pathname === "/explore" ? "page" : undefined}
            >
              Explore
              <span className={cn(
                "absolute bottom-[-8px] left-0 w-full h-0.5 bg-purple-600 transition-transform duration-200",
                location.pathname === "/explore" ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
              )} />
            </Link>

            <Link
              to="/"
              onClick={scrollToTop}
              className={cn(
                "text-gray-700 hover:text-purple-600 transition-colors duration-200 font-medium relative group",
                location.pathname === "/" && "text-purple-600"
              )}
              aria-current={location.pathname === "/" ? "page" : undefined}
            >
              Home
              <span className={cn(
                "absolute bottom-[-8px] left-0 w-full h-0.5 bg-purple-600 transition-transform duration-200",
                location.pathname === "/" ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
              )} />
            </Link>

            <Link
              to="/courses"
              onClick={scrollToTop}
              className={cn(
                "text-gray-700 hover:text-purple-600 transition-colors duration-200 font-medium relative group",
                location.pathname === "/courses" && "text-purple-600"
              )}
              aria-current={location.pathname === "/courses" ? "page" : undefined}
            >
              Courses
              <span className={cn(
                "absolute bottom-[-8px] left-0 w-full h-0.5 bg-purple-600 transition-transform duration-200",
                location.pathname === "/courses" ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
              )} />
            </Link>

            <Link
              to="/events"
              onClick={scrollToTop}
              className={cn(
                "text-gray-700 hover:text-purple-600 transition-colors duration-200 font-medium relative group",
                location.pathname === "/events" && "text-purple-600"
              )}
              aria-current={location.pathname === "/events" ? "page" : undefined}
            >
              Events
              <span className={cn(
                "absolute bottom-[-8px] left-0 w-full h-0.5 bg-purple-600 transition-transform duration-200",
                location.pathname === "/events" ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
              )} />
            </Link>

            <Link
              to="/blog"
              onClick={scrollToTop}
              className={cn(
                "text-gray-700 hover:text-purple-600 transition-colors duration-200 font-medium relative group",
                location.pathname === "/blog" && "text-purple-600"
              )}
              aria-current={location.pathname === "/blog" ? "page" : undefined}
            >
              Blog
              <span className={cn(
                "absolute bottom-[-8px] left-0 w-full h-0.5 bg-purple-600 transition-transform duration-200",
                location.pathname === "/blog" ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
              )} />
            </Link>

            <div className="relative group">
              <button className="text-gray-700 hover:text-purple-600 transition-colors duration-200 font-medium flex items-center">
                Pages
                <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {/* Dropdown menu can be added here */}
            </div>

            <Link
              to="/contact"
              onClick={scrollToTop}
              className={cn(
                "text-gray-700 hover:text-purple-600 transition-colors duration-200 font-medium relative group",
                location.pathname === "/contact" && "text-purple-600"
              )}
              aria-current={location.pathname === "/contact" ? "page" : undefined}
            >
              Contact
              <span className={cn(
                "absolute bottom-[-8px] left-0 w-full h-0.5 bg-purple-600 transition-transform duration-200",
                location.pathname === "/contact" ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
              )} />
            </Link>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Search Icon */}
            <button
              className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-all duration-200"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {loading ? (
              // Loading skeleton
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ) : currentUser ? (
              // Authenticated user actions
              <div className="hidden md:flex items-center space-x-3">
                {/* Notifications */}
                <button
                  className="relative p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-all duration-200"
                  aria-label="View notifications"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    3
                  </span>
                </button>

                {/* Messages */}
                <Link
                  to="/messages"
                  className="relative p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-all duration-200"
                  aria-label="View messages"
                  title="Messages"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                    2
                  </span>
                </Link>

                {/* User Profile Dropdown */}
                <UserProfileDropdown />
              </div>
            ) : (
              // Unauthenticated user actions
              <div className="hidden md:flex items-center space-x-4">
                <Link
                  to="/auth/signin"
                  className="text-gray-700 hover:text-purple-600 transition-colors duration-200 font-medium"
                  aria-label="Sign in to your account"
                >
                  Log In
                </Link>
                <Link
                  to="/auth/signup"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  aria-label="Create new account"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="lg:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMenuOpen ? "Close mobile menu" : "Open mobile menu"}
            >
              {isMenuOpen ? (
                <X className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Menu className="w-6 h-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <nav
          id="mobile-menu"
          className={cn(
            "lg:hidden transition-all duration-300 ease-in-out overflow-hidden",
            isMenuOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
          )}
          aria-label="Mobile navigation"
          role="navigation"
          aria-hidden={!isMenuOpen}
        >
          <div className="py-6 space-y-4 border-t border-gray-100 bg-white">
            {/* Mobile Navigation Links */}
            <div className="space-y-4">
              <Link
                to="/explore"
                className={cn(
                  "block text-gray-700 hover:text-purple-600 transition-colors duration-200 font-medium py-2",
                  location.pathname === "/explore" && "text-purple-600"
                )}
                onClick={() => {
                  setIsMenuOpen(false);
                  scrollToTop();
                }}
              >
                Explore
              </Link>

              <Link
                to="/"
                className={cn(
                  "block text-gray-700 hover:text-purple-600 transition-colors duration-200 font-medium py-2",
                  location.pathname === "/" && "text-purple-600"
                )}
                onClick={() => {
                  setIsMenuOpen(false);
                  scrollToTop();
                }}
              >
                Home
              </Link>

              <Link
                to="/courses"
                className={cn(
                  "block text-gray-700 hover:text-purple-600 transition-colors duration-200 font-medium py-2",
                  location.pathname === "/courses" && "text-purple-600"
                )}
                onClick={() => {
                  setIsMenuOpen(false);
                  scrollToTop();
                }}
              >
                Courses
              </Link>

              <Link
                to="/events"
                className={cn(
                  "block text-gray-700 hover:text-purple-600 transition-colors duration-200 font-medium py-2",
                  location.pathname === "/events" && "text-purple-600"
                )}
                onClick={() => {
                  setIsMenuOpen(false);
                  scrollToTop();
                }}
              >
                Events
              </Link>

              <Link
                to="/blog"
                className={cn(
                  "block text-gray-700 hover:text-purple-600 transition-colors duration-200 font-medium py-2",
                  location.pathname === "/blog" && "text-purple-600"
                )}
                onClick={() => {
                  setIsMenuOpen(false);
                  scrollToTop();
                }}
              >
                Blog
              </Link>

              <button className="block text-gray-700 hover:text-purple-600 transition-colors duration-200 font-medium py-2 text-left">
                Pages
              </button>

              <Link
                to="/contact"
                className={cn(
                  "block text-gray-700 hover:text-purple-600 transition-colors duration-200 font-medium py-2",
                  location.pathname === "/contact" && "text-purple-600"
                )}
                onClick={() => {
                  setIsMenuOpen(false);
                  scrollToTop();
                }}
              >
                Contact
              </Link>
            </div>

            {/* Mobile Auth Section */}
            {currentUser ? (
              <div className="pt-4 border-t border-gray-100 space-y-4">
                <div className="flex items-center space-x-4">
                  <button
                    className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 transition-colors duration-200"
                    aria-label="View notifications"
                  >
                    <Bell className="w-5 h-5" />
                    <span>Notifications</span>
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">3</span>
                  </button>
                  <Link
                    to="/messages"
                    className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 transition-colors duration-200"
                    aria-label="View messages"
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span>Messages</span>
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">2</span>
                  </Link>
                </div>
                <UserProfileDropdown isMobile={true} />
              </div>
            ) : (
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <Link
                  to="/auth/signin"
                  className="block text-center text-gray-700 hover:text-purple-600 px-4 py-3 rounded-lg font-medium transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Log In
                </Link>
                <Link
                  to="/auth/signup"
                  className="block text-center bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-medium transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;

import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, LogOut, Settings, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { signOutUser } from '@/services/authService';
import { cn } from '@/lib/utils';

const UserProfileDropdown: React.FC<{ isMobile?: boolean }> = ({ isMobile = false }) => {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setIsOpen(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (!currentUser) {
    return null;
  }

  const displayName = currentUser.displayName || 'User';
  const email = currentUser.email || '';
  const photoURL = currentUser.photoURL;

  // Get initials from display name or email
  const getInitials = (name: string, email: string) => {
    if (name && name !== 'User') {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email.charAt(0).toUpperCase();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center space-x-3 p-2 rounded-lg hover:bg-primary-50 transition-colors",
          isMobile ? "w-full justify-start" : ""
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Profile Image or Avatar */}
        <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center overflow-hidden">
          {photoURL ? (
            <img
              src={photoURL}
              alt={`${displayName} profile`}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white text-sm font-medium">
              {getInitials(displayName, email)}
            </span>
          )}
        </div>

        {/* User Name - Show on desktop and mobile */}
        <div className={cn(
          "text-left flex-1",
          isMobile ? "block" : "hidden md:block"
        )}>
          <p className="text-sm font-medium text-foreground">
            {displayName}
          </p>
          <p className="text-xs text-muted-foreground truncate max-w-32">
            {email}
          </p>
        </div>

        {/* Dropdown Arrow */}
        <svg
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            isOpen && "transform rotate-180"
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={cn(
          "absolute mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50",
          isMobile ? "left-0 right-0 w-full" : "right-0 w-64"
        )}>
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center overflow-hidden">
                {photoURL ? (
                  <img
                    src={photoURL}
                    alt={`${displayName} profile`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-medium">
                    {getInitials(displayName, email)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {displayName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {email}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <Link
              to="/profile"
              className="flex items-center px-4 py-2 text-sm text-foreground hover:bg-gray-50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <User className="w-4 h-4 mr-3" />
              Profile
            </Link>
            
            <Link
              to="/settings"
              className="flex items-center px-4 py-2 text-sm text-foreground hover:bg-gray-50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="w-4 h-4 mr-3" />
              Settings
            </Link>

            {!currentUser.emailVerified && (
              <div className="flex items-center px-4 py-2 text-sm text-amber-600">
                <Mail className="w-4 h-4 mr-3" />
                Email not verified
              </div>
            )}

            <hr className="my-1" />

            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfileDropdown;

import React from 'react';
import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import Header from './Header';
import Footer from './Footer';
import OnboardingRedirect from './OnboardingRedirect';
import { ChatbotWidget } from '@/modules/support';

interface LayoutProps {
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({ className }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-50 to-white">
      {/* Skip to main content for accessibility */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary-600 text-white px-4 py-2 rounded-md z-50"
      >
        Skip to main content
      </a>
      
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <main 
        id="main-content"
        className={cn("flex-1", className)}
        role="main"
        aria-label="Main content"
      >
        <OnboardingRedirect>
          <Outlet />
        </OnboardingRedirect>
      </main>
      
      {/* Footer */}
      <Footer />
      
      {/* Support Chatbot */}
      <ChatbotWidget />
    </div>
  );
};

export default Layout;

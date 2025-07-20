import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-50 to-white">
      {/* Header */}
      <Header />
      
      {/* Main Auth Content */}
      <main 
        className="flex-1 flex items-center justify-center py-12 px-4"
        role="main"
        aria-label="Authentication"
      >
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default AuthLayout;
